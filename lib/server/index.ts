import 'source-map-support/register';

import { join as pJoin } from 'path';
import { Server } from '@hapi/hapi';
import * as inert from '@hapi/inert';

const port = Number(process.env.PORT) || 8080;

(async () => {
  const server = new Server({
    port,
    router: {
      stripTrailingSlash: true,
    },
    routes: {
      files: {
        relativeTo: pJoin(__dirname, '../client'),
      },
      response: {
        options: {
          allowUnknown: false,
        },
      },
      validate: {
        options: {
          allowUnknown: false,
        },
        failAction: async (_request, _h, error) => {
          throw error;
        }
      }
    }
  });

  await server.register([
    inert,
  ]);

  server.route({
    method: 'GET',
    path: '/static/{param*}',
    handler: {
      directory: {
        path: '.',
      },
    },
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: {
      file: 'views/index.html',
    },
  });

  await server.start();
})();

process.on('unhandledRejection', (error) => {
  console.error(error);
  process.exit(1);
});
