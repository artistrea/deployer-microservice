import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["up", "down", "build"]),
  id: z.string(),
  address: z.string().optional(),
});

const command = {
  up: ["docker", "compose", "up", "-d"],
  down: ["docker", "compose", "down"],
  build: ["docker", "compose", "up", "-d", "--build"],
};

const server = Bun.serve({
  port: Number(process.env.PORT) || 1357,
  async fetch(req) {
    if (req.method !== "POST")
      return new Response("Requisição inválida", { status: 404 });

    const body = await req.json();
    const authorization = req.headers.get("X-Authorization");

    if (authorization !== process.env.API_KEY)
      return new Response("Deu errado 0!", {
        status: 401,
        statusText: "Unauthorized",
      });
    const result = bodySchema.safeParse(body);

    if (!result.success) {
      return new Response("Deu errado 1!", {
        status: 422,
        statusText: "Invalid body",
      });
    }

    const paths = await Bun.file("./paths.json").json();
    if (!(result.data.id in paths))
      return new Response("Deu errado 5!", {
        status: 404,
        statusText: "Not Found",
      });

    try {
      if (result.data.address) {
          const proc = Bun.spawn(command[result.data.action], {
            cwd: paths[result.data.id],
            env: { BRANCH: result.data.address},
            stdin: "inherit",
            stdout: "inherit"
          })
          await proc.exited;
      } else {
          const proc = Bun.spawn(command[result.data.action], {
            cwd: paths[result.data.id],
            stdin: "inherit",
            stdout: "inherit",
          });
          await proc.exited;
      }
        
      return new Response(JSON.stringify({ message: "AE" }), {
        status: 200,
      });
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
