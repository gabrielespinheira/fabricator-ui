import kleur from "kleur"

export const highlight = {
  info: (text: string) => kleur.cyan(text),
  success: (text: string) => kleur.green(text),
  warn: (text: string) => kleur.yellow(text),
  error: (text: string) => kleur.red(text),
  dim: (text: string) => kleur.dim(text),
  bold: (text: string) => kleur.bold(text),
}

export const logger = {
  log: (...args: unknown[]) => console.log(...args),
  info: (message: string) => console.log(`${kleur.cyan("ℹ")} ${message}`),
  success: (message: string) => console.log(`${kleur.green("✔")} ${message}`),
  warn: (message: string) => console.warn(`${kleur.yellow("⚠")} ${message}`),
  error: (message: string) => console.error(`${kleur.red("✖")} ${message}`),
  note: (message: string) => console.log(kleur.dim(message)),
  break: () => console.log(""),
}
