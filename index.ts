const bodySchema = {
  action: ["up", "down", "build"],
  name: "",
  // rollback: {branch: string, commit: string},
} as const;

const command = {
  up: ["docker", "compose", "up", "-d"],
  down: ["docker", "compose", "down"],
  build: ["docker", "compose", "up", "-d", "--build"],
};

function validateAction(
  action: string
): action is (typeof bodySchema.action)[number] {
  return bodySchema.action.includes(action as any);
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 1357,
  async fetch(req) {
    const body = await req.json();
    const authorization = req.headers.get("X-Authorization");

    if (authorization !== process.env.API_KEY)
      return new Response("Deu errado 0!", {
        status: 401,
        statusText: "Unauthorized",
      });

    if (!body)
      return new Response("Faltou o corpo", {
        status: 422,
        statusText: "Unprocessable Entity",
      });

    if (typeof body !== "object" || !("action" in body) || !("name" in body) || (body.rollback && typeof body.rollback !== "object"))
      return new Response("Deu errado 2!", {
        status: 422,
        statusText: "Unprocessable Entity",
      });

    if (typeof body.action !== "string" || typeof body.name !== "string" || (body.rollback && (typeof body.rollback.branch !== "string" || typeof body.rollback.commit !== "string")))
      return new Response("Deu errado 3!", {
        status: 422,
        statusText: "Unprocessable Entity",
      });

    if (!validateAction(body.action))
      return new Response("Deu errado 4!", {
        status: 422,
        statusText: "Unprocessable Entity",
      });

    const paths = await Bun.file("./paths.json").json();

    if (!(body.name in paths))
      return new Response("Deu errado 5!", {
        status: 404,
        statusText: "Not Found",
      });

    try {
      if (body.rollback) {

        const proc = Bun.spawn(["git", "pull", "--branch", body.rollback.branch, "&&", "git", "checkout", body.rollback.commit], {
          cwd: paths[body.name],
          stdin: "inherit",
          stdout: "inherit",
        });
        await proc.exited;
      }

      const proc = Bun.spawn(command[body.action], {
        cwd: paths[body.name],
        stdin: "inherit",
        stdout: "inherit",
      });

      await proc.exited;

      return new Response();
    } catch (e) {
      if (e instanceof Error)
        return new Response(JSON.stringify(e), {
          status: 500,
        });

      return new Response("Deu merda", {
        status: 500,
      });
    }
  },
  error() {
    return undefined;
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
 