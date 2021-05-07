import { useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { api } from '../services/apiClient';
import { setupAPIClient } from '../services/api';
import { withSSRAuth } from '../utils/withSSRAuth';
import { useCan } from '../hooks/useCan';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  // Por mais que utilizemos as verificações no front-end,
  // é importante lembrar que o backend também precisa validar
  // se as métricas, ou qualquer outra informação pode ser acessada por aquele usuário
  const userCanSeeMetrics = useCan({ permissions: ['metrics.list'] });

  useEffect(() => {
    api
      .get('/me')
      .then((response) => console.log(response))
      .catch((err) => console.log(err));
  }, []);

  return (
    <>
      <h1>Dashboard: {user?.email}</h1>
      {userCanSeeMetrics && <div>Métricas</div>}
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
