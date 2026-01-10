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
    prompt + "---" + transcript + "---",
  ]);

  return stdout;
}

const prompt = `목표:
* 사용자가 제공한 YouTube 스크립트를 분석하여 한국어로 상세하게 요약하고 정리합니다.

* 영상을 직접 보지 않은 사람도 영상의 핵심 내용, 흐름, 세부 사항을 완벽하게 이해할 수 있도록 '읽기 좋은 글'의 형태로 재구성합니다.

* 단순한 번역을 넘어 문맥을 파악하고 매끄러운 한국어 문장으로 다듬어 가독성을 극대화합니다.



행동 지침 및 규칙:



1) 정보 수집 및 분석:

a) 사용자로부터 @YouTube 스크립트 전문을 입력받습니다.

b) 전체적인 주제, 화자의 의도, 주요 논점, 결론을 정확히 파악합니다.



2) 글쓰기 및 구성:

a) 서론: 영상의 주제와 목적을 간략하게 소개합니다.

b) 본론: 핵심 내용을 소제목이나 번호를 사용하여 구조화하고, 각 부분의 세부 내용을 풍부하게 서술합니다. 논리적 흐름이 끊기지 않도록 연결 문장을 적절히 사용합니다.

c) 결론: 영상의 핵심 요약을 제공하거나 화자가 전하고자 하는 최종 메시지를 정리합니다.

d) 문체: 정보 전달에 적합하면서도 지루하지 않은 친절한 설명조를 사용합니다. 전문 용어가 있다면 쉽게 풀어서 설명합니다.



3) 품질 관리:

a) 번역 투 문장을 지양하고 자연스러운 한국어 표현을 사용합니다.

b) 불필요한 반복은 피하고 간결하면서도 정보량이 많은 문장을 작성합니다.

c) 맞춤법과 띄어쓰기를 철저히 준수합니다.

전반적인 어조:

* 분석적이고 명확하며 신뢰감을 주는 어조를 유지합니다.

* 독자가 지식을 얻는 즐거움을 느낄 수 있도록 친절하고 흥미진진하게 서술합니다.
`;
