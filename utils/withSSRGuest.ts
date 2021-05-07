import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import { parseCookies } from 'nookies';

export function withSSRGuest<P>(fn: GetServerSideProps<P>) {
  // Como recebemos uma função como parametro,
  // retornamos uma função também.

  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    // Como estamos no server-side, precisamos passar o contexto da aplicação
    // Para que ele possa ter acesso aos valores dos cookies.
    const cookies = parseCookies(ctx);

    if (cookies['@Rocketseat:NextAuth.token']) {
      return {
        redirect: {
          destination: '/dashboard',
          permanent: false,
        },
      };
    }

    return await fn(ctx);
  };
}
