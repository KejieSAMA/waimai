import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { initializeAdmin } from "../src/modules/accounts/service";
import { db } from "../src/db";
import { HttpError } from "../src/http";
import { ZodError } from "zod";
async function hidden(prompt: string): Promise<string> {
  if (!stdin.isTTY)
    throw new HttpError(400, "必须在本机交互终端中运行，不接受管道密码");
  stdout.write(prompt);
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const done = () => {
      stdin.off("keypress", listener);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const listener = (
      text: string,
      key: { name?: string; ctrl?: boolean; meta?: boolean },
    ) => {
      if (key.ctrl && key.name === "c") {
        done();
        reject(new HttpError(400, "已取消"));
      } else if (key.name === "return") {
        done();
        resolve(value);
      } else if (key.name === "backspace")
        value = [...value].slice(0, -1).join("");
      else if (
        text &&
        !key.ctrl &&
        !key.meta &&
        [...text].every(
          (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
        )
      )
        value += text;
    };
    stdin.on("keypress", listener);
  });
}
try {
  if (!stdin.isTTY) throw new HttpError(400, "请在本机交互终端运行");
  const rl = createInterface({ input: stdin, output: stdout });
  const username = await rl.question("管理员账号：");
  rl.close();
  const password = await hidden("密码（输入不回显）：");
  const confirm = await hidden("再次输入密码：");
  if (password !== confirm) throw new HttpError(400, "两次密码不一致");
  await initializeAdmin(username, password, process.argv.includes("--recover"));
  stdout.write("管理员操作完成。恢复的账号下次登录必须修改密码。\n");
} catch (e) {
  process.stderr.write(
    (e instanceof HttpError
      ? e.message
      : e instanceof ZodError
        ? e.issues.map((i) => i.message).join("；")
        : "操作失败，请检查部署配置和数据库") + "\n",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
