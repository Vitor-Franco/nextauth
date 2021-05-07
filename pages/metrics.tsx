import { setupAPIClient } from '../services/api';
import { withSSRAuth } from '../utils/withSSRAuth';

const Metrics = () => {
  return (
    <>
      <h1>Metrics</h1>
    </>
  );
};

export default Metrics;

// Não aparece nem o conteúdo do site, uma vez que o redirect ocorre
// via server-side quando o usuário não está autenticado.
export const getServerSideProps = withSSRAuth(
  async (ctx) => {
    const apiClient = setupAPIClient(ctx);
    const response = await apiClient.get('/me');

    return {
      props: {},
    };
  },
  {
    permissions: ['metrics.list'],
    roles: ['administrator'],
  }
);
