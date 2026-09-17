import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

const isWindows = process.platform === 'win32';

const dockerCommand = isWindows ? 'docker.exe' : 'docker';

const composeFile =
  'infrastructure/docker/docker-compose.yml';

const POSTGRES_HOST = '127.0.0.1';
const POSTGRES_PORT = 5432;

const REDIS_HOST = '127.0.0.1';
const REDIS_PORT = 6379;

const DOCKER_TIMEOUT_MS = 120000;
const INFRASTRUCTURE_TIMEOUT_MS = 120000;

function runCommand(
  command: string,
  args: string[],
  timeout = 10000,
) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'pipe',
    timeout,
    encoding: 'utf8',
    shell: false,
  });
}

function isDockerReady(): boolean {
  const result = runCommand(
    dockerCommand,
    ['info'],
    10000,
  );

  return result.status === 0;
}

function startDockerDesktop(): void {
  if (!isWindows) {
    return;
  }

  console.log(
    '\n[dev] Docker engine is not ready.',
  );

  console.log(
    '[dev] Starting Docker Desktop...',
  );

  const localAppData =
    process.env.LOCALAPPDATA;

  if (!localAppData) {
    console.error(
      '[dev] LOCALAPPDATA environment variable is not available.',
    );

    process.exit(1);
  }

  const dockerDesktopPath =
    `${localAppData}\\Programs\\DockerDesktop\\Docker Desktop.exe`;

  const child = spawn(
    dockerDesktopPath,
    [],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    },
  );

  child.once(
    'error',
    (error: Error) => {
      console.error(
        '\n[dev] Failed to start Docker Desktop.',
      );

      console.error(
        `[dev] Expected path: ${dockerDesktopPath}`,
      );

      console.error(
        `[dev] ${error.message}`,
      );

      process.exit(1);
    },
  );

  child.unref();

  console.log(
    '[dev] Docker Desktop startup requested.',
  );
}

async function waitForDocker(
  timeoutMs = DOCKER_TIMEOUT_MS,
): Promise<void> {
  const start = Date.now();

  process.stdout.write(
    '[dev] Waiting for Docker engine',
  );

  while (
    Date.now() - start <
    timeoutMs
  ) {
    if (isDockerReady()) {
      console.log(
        '\n[dev] Docker engine is ready.',
      );

      return;
    }

    process.stdout.write('.');

    await new Promise<void>(
      (resolve) => {
        setTimeout(resolve, 2000);
      },
    );
  }

  console.log('');

  console.error(
    '[dev] Docker engine did not become ready within 120 seconds.',
  );

  process.exit(1);
}

function startInfrastructure(): void {
  console.log(
    '\n[dev] Ensuring PostgreSQL and Redis are running...',
  );

  const result = spawnSync(
    dockerCommand,
    [
      'compose',
      '-f',
      composeFile,
      'up',
      '-d',
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      timeout: DOCKER_TIMEOUT_MS,
      shell: false,
    },
  );

  if (result.error) {
    console.error(
      '\n[dev] Docker Compose failed to start.',
    );

    console.error(
      result.error.message,
    );

    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(
      '\n[dev] Failed to start PostgreSQL and Redis.',
    );

    process.exit(1);
  }

  console.log(
    '[dev] PostgreSQL and Redis containers started.',
  );
}

function canConnect(
  host: string,
  port: number,
  timeoutMs = 1500,
): Promise<boolean> {
  return new Promise(
    (resolve) => {
      const socket = new net.Socket();

      let settled = false;

      const finish = (
        result: boolean,
      ) => {
        if (settled) {
          return;
        }

        settled = true;

        socket.destroy();

        resolve(result);
      };

      socket.setTimeout(timeoutMs);

      socket.once(
        'connect',
        () => {
          finish(true);
        },
      );

      socket.once(
        'timeout',
        () => {
          finish(false);
        },
      );

      socket.once(
        'error',
        () => {
          finish(false);
        },
      );

      socket.connect(
        port,
        host,
      );
    },
  );
}

async function waitForInfrastructure(
  timeoutMs = INFRASTRUCTURE_TIMEOUT_MS,
): Promise<void> {
  const start = Date.now();

  console.log(
    '\n[dev] Waiting for PostgreSQL and Redis to become ready...',
  );

  let lastStatus = '';

  while (
    Date.now() - start <
    timeoutMs
  ) {
    const [
      postgresReady,
      redisReady,
    ] = await Promise.all([
      canConnect(
        POSTGRES_HOST,
        POSTGRES_PORT,
      ),
      canConnect(
        REDIS_HOST,
        REDIS_PORT,
      ),
    ]);

    const status =
      `[PostgreSQL: ${
        postgresReady
          ? 'ready'
          : 'waiting'
      }] [Redis: ${
        redisReady
          ? 'ready'
          : 'waiting'
      }]`;

    if (status !== lastStatus) {
      console.log(
        `[dev] ${status}`,
      );

      lastStatus = status;
    }

    if (
      postgresReady &&
      redisReady
    ) {
      console.log(
        '[dev] PostgreSQL is ready on port 5432.',
      );

      console.log(
        '[dev] Redis is ready on port 6379.',
      );

      console.log(
        '[dev] Infrastructure is ready.',
      );

      return;
    }

    await new Promise<void>(
      (resolve) => {
        setTimeout(resolve, 2000);
      },
    );
  }

  console.error('');

  console.error(
    '[dev] PostgreSQL and Redis did not become ready within 120 seconds.',
  );

  console.error(
    '[dev] Docker containers may still be starting or unhealthy.',
  );

  process.exit(1);
}

function startTurbo(): void {
  console.log(
    '\n[dev] Starting NEXUS-OBSERVE...\n',
  );

  if (isWindows) {
    const turbo = spawn(
      'cmd.exe',
      [
        '/d',
        '/s',
        '/c',
        'npx turbo dev',
      ],
      {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
        windowsHide: false,
      },
    );

    let shuttingDown = false;

    const shutdown = () => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;

      if (!turbo.killed) {
        turbo.kill();
      }
    };

    process.once(
      'SIGINT',
      shutdown,
    );

    process.once(
      'SIGTERM',
      shutdown,
    );

    turbo.once(
      'error',
      (error: Error) => {
        console.error(
          '\n[dev] Failed to start NEXUS-OBSERVE.',
        );

        console.error(
          `[dev] ${error.message}`,
        );

        process.exit(1);
      },
    );

    turbo.once(
      'exit',
      (
        code: number | null,
      ) => {
        process.exit(code ?? 0);
      },
    );

    return;
  }

  const turbo = spawn(
    'npx',
    [
      'turbo',
      'dev',
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    },
  );

  const shutdown = () => {
    if (!turbo.killed) {
      turbo.kill();
    }
  };

  process.once(
    'SIGINT',
    shutdown,
  );

  process.once(
    'SIGTERM',
    shutdown,
  );

  turbo.once(
    'error',
    (error: Error) => {
      console.error(
        '\n[dev] Failed to start NEXUS-OBSERVE.',
      );

      console.error(
        `[dev] ${error.message}`,
      );

      process.exit(1);
    },
  );

  turbo.once(
    'exit',
    (
      code: number | null,
    ) => {
      process.exit(code ?? 0);
    },
  );
}

async function main(): Promise<void> {
  console.log(
    '========================================',
  );

  console.log(
    ' NEXUS-OBSERVE Development Startup',
  );

  console.log(
    '========================================',
  );

  if (!isDockerReady()) {
    startDockerDesktop();

    await waitForDocker();
  } else {
    console.log(
      '[dev] Docker engine is already ready.',
    );
  }

  startInfrastructure();

  await waitForInfrastructure();

  startTurbo();
}

main().catch(
  (error: unknown) => {
    console.error(
      '\n[dev] Development startup failed:',
    );

    console.error(error);

    process.exit(1);
  },
);