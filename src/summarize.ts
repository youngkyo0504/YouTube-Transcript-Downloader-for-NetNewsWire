// 3. 커맨드 실행 (Bun.spawn 사용)
async function execCommand(args: string[]) {
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Command failed: ${args.join(" ")}\n${stderr}`);
  }

  return { stdout, stderr };
}

export async function summarizeTranscript(transcript: string) {
  const { stdout } = await execCommand([
    "gemini",
    `'--- ${transcript} --- ${prompt} --- ${transcript} --- ${prompt}'`,
    "--model",
    "gemini-2.5-pro",
  ]);

  return stdout;
}

/**
 * prompt를 채워넣으세요.
 */
const prompt = `prompt를 채워넣으세요.`;
