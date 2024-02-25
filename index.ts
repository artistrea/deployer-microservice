import { z } from "zod";

const command = {
  up: ["docker", "compose", "up", "-d"],
  down: ["docker", "compose", "down"],
  build: ["docker", "compose", "up", "-d", "--build"],
};

const bodySchema = z.object({
  action: z.enum(["up", "down", "build"]),
  id: z.string(),
  address: z.string().optional(),
  private_token: z.string().optional(),
});
type bodyType = z.infer<typeof bodySchema>

const pathsSchema = z.record(z.string(), z.string());
type pathsType = z.infer<typeof pathsSchema>


async function recordAction(body: bodyType, paths: pathsType) {
  try {
    // GRAVAR NO BD QUE COMECOU
    const proc = Bun.spawn(command[body.action], {
      cwd: paths[body.id],
      env: {
        BRANCH: body.address? body.address : undefined,
        TOKEN: body.private_token? body.private_token : undefined,
      },
      stdin: "inherit",
      stdout: "inherit"
    })
    await proc.exited;
    console.log("It worked")
    // GRAVAR NO BD QUE DEU CERTO
  } catch(e) {
    if (e instanceof Error) 
      console.log(`It didn't work - ${e.message}`)
      // GRAVAR NO BD QUE DEU ERRADO
  }
}


const server = Bun.serve({
  port: Number(process.env.PORT) || 1357,
  async fetch(req) {
    if (req.method !== "POST") {
      console.log("Request is not valid") 
      return new Response("Invalid request", { status: 404 });
    }
    const body = await req.json();

    const authorization = req.headers.get("X-Authorization");
    if (authorization !== process.env.API_KEY) {
      console.log("Authorization key is not valid")
      return new Response("Deu errado 0!", {
        status: 401,
        statusText: "Unauthorized",
      });
    }
    
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      console.log("Body is not valid")
      return new Response("Deu errado 1!", {
        status: 422,
        statusText: "Invalid body",
      });
    }

    const paths = await Bun.file("./paths.json").json();
    if (!(result.data.id in paths)) {
      console.log("Path is not valid")
      return new Response("Deu errado 2!", {
        status: 404,
        statusText: "Not Found",
      });
    }
      
    recordAction(result.data, paths);
    return new Response("Deploy started", {
      status: 200,
      statusText: "Sucess"
    })

  },
  error() {
    console.log("Some error has occurred")
    return undefined;
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
