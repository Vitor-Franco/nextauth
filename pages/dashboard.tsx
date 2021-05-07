import { useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { api } from '../services/apiClient';
import { setupAPIClient } from '../services/api';
import { withSSRAuth } from '../utils/withSSRAuth';
import { Can } from '../components/Can';

const Dashboard = () => {
  const { user, signOut } = useContext(AuthContext);

  // Por mais que utilizemos as verificações no front-end,
  // é importante lembrar que o backend também precisa validar
  // se as métricas, ou qualquer outra informação pode ser acessada por aquele usuário

  useEffect(() => {
    api
      .get('/me')
      .then((response) => console.log(response))
      .catch((err) => console.log(err));
  }, []);

  return (
    <>
      <h1>Dashboard: {user?.email}</h1>
      <Can permissions={['metrics.list']}>
        <div>Métricas</div>
      </Can>

      <button type="button" onClick={signOut}>
        Sign Out
      </button>
    </>
  );
};

export default Dashboard;

// Não aparece nem o conteúdo do site, uma vez que o redirect ocorre
// via server-side quando o usuário não está autenticado.
export const getServerSideProps = withSSRAuth(async (ctx) => {
  const apiClient = setupAPIClient(ctx);
  const response = await apiClient.get('/me');

  return {
    props: {},
  };
});
