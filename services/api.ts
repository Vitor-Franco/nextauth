import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { signOut } from '../contexts/AuthContext';
import { AuthTokenError } from './errors/AuthTokenError';

let isRefreshing = false;
let failedRequestsQueue = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['@Rocketseat:NextAuth.token']}`,
    },
  });

  // Interceptor age sobre toda requisição à nossa aplicação.
  api.interceptors.response.use(
    // Se a requisição for status de sucesso, a retornamos.
    (response) => {
      return response;
    },
    // Se for status de erro, tratamos o erro para chegar no refreshToken, se for o caso.
    (error: AxiosError) => {
      if (error.response.status === 401) {
        // Identifica erro de token expirado
        if (error.response.data?.code === 'token.expired') {
          // renovar o token

          // -> atualiza os cookies novamente, agora dentro do if
          cookies = parseCookies(ctx);
          const { '@Rocketseat:NextAuth.refreshToken': refreshToken } = cookies;

          // Possui todas config da requisição que falhou. (para podermos refazer a chamada com as mesmas condições)
          const originalConfig = error.config;

          // Utilizamos a váriavel isRefreshing para evitar que duas requisições chamem o Refresh juntas
          if (!isRefreshing) {
            isRefreshing = true;
            api
              .post('/refresh', { refreshToken })
              .then((response) => {
                const { token } = response.data;

                setCookie(ctx, '@Rocketseat:NextAuth.token', token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 dias
                  path: '/',
                });

                setCookie(
                  ctx,
                  '@Rocketseat:NextAuth.refreshToken',
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 dias
                    path: '/',
                  }
                );

                // Após o refresh atualizamos os headers das requisições
                api.defaults.headers['Authorization'] = `Bearer ${token}`;

                // Pegamos a fila das requisições que falharam por conta do token ter expirado,
                // E para cada uma delas, refazemos as requisições novamente.
                // Utilizando o método que setamos pra elas quando falharam e passando o token correto (atualizado).
                failedRequestsQueue.forEach((req) => req.onSuccess(token));
                failedRequestsQueue = [];
              })
              .catch((err) => {
                failedRequestsQueue.forEach((req) => req.onFailure(err));
                failedRequestsQueue = [];

                if (process.browser) {
                  signOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          // Se já estiver ocorrendo um refresh,
          // Eu adiciono no array de Requests, essa chamada atual.
          return new Promise((resolve, reject) => {
            // Para esse array, disponibilizamos um objeto
            // com dois métodos:
            // -> onSuccess, caso a atualização de token dê certo.
            // -> onFailure, caso o token falhe.
            failedRequestsQueue.push({
              // Para isso recebemos o parâmetro do novo token,
              // e o setamos nos headers.
              onSuccess: (token: string) => {
                originalConfig.headers['Authorization'] = `Bearer ${token}`;

                // Refazemos a chamada original, apenas atualizando o token.
                resolve(api(originalConfig));
              },
              onFailure: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        } else {
          // deslogar o usuário
          if (process.browser) {
            signOut();
          } else {
            return Promise.reject(new AuthTokenError());
          }
        }
      }

      // Se o erro não se encaixar nas condições acima,
      // deixamos ele prosseguir para o catch
      // presente nas requisições de cada página.
      return Promise.reject(error);
    }
  );

  return api;
}
