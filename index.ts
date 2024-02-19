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

async function recordAction(data, paths) {
  try {
    // GRAVAR NO BD QUE COMECOU
    const proc = Bun.spawn(command[data.action], {
      cwd: paths[data.id],
      env: data.address? { BRANCH: data.address} : {},
      stdin: "inherit",
      stdout: "inherit"
    })

    await proc.exited;
    console.log("It worked")
    // GRAVAR NO BD QUE DEU CERTO
  } catch(e) {
    console.log("It didn't work")
    // GRAVAR NO BD QUE DEU ERRADO
  }
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 1357,
  async fetch(req) {
    if (req.method !== "POST")
      return new Response("Invalid request", { status: 404 });
    console.log("Request is valid")
    const body = await req.json();

    const authorization = req.headers.get("X-Authorization");
    if (authorization !== process.env.API_KEY)
      return new Response("Deu errado 0!", {
        status: 401,
        statusText: "Unauthorized",
      });
      console.log("Authorization key is valid")
    
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return new Response("Deu errado 1!", {
        status: 422,
        statusText: "Invalid body",
      });
    }
    console.log("Body is valid")

    const paths = await Bun.file("./paths.json").json();
    if (!(result.data.id in paths))
      return new Response("Deu errado 5!", {
        status: 404,
        statusText: "Not Found",
      });
    console.log("Path is valid")
    
    recordAction(result.data, paths);
    return new Response(JSON.stringify({ message: "Deploy iniciado"}), {
      status: 200,
    })

  },
  error() {
    console.log("Some error has occurred")
    return undefined;
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
