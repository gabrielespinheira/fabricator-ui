import {
  Geist_Mono as FontMono,
  Noto_Sans_Arabic as FontNotoSansArabic,
  Noto_Sans_Hebrew as FontNotoSansHebrew,
  Inter as FontSans,
} from "next/font/google"
import { cn } from "cn"

// Inter with its optical-size axis: the Fabricator weights pair `wght` with
// `opsz` so labels can get heavier without shifting the layout.
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  axes: ["opsz"],
})

const fontHeading = FontSans({
  subsets: ["latin"],
  variable: "--font-heading",
  axes: ["opsz"],
})

const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400"],
})

const fontNotoSansArabic = FontNotoSansArabic({
  subsets: ["latin"],
  variable: "--font-ar",
})

const fontNotoSansHebrew = FontNotoSansHebrew({
  subsets: ["latin"],
  variable: "--font-he",
})

export const fontVariables = cn(
  fontSans.variable,
  fontHeading.variable,
  fontMono.variable,
  fontNotoSansArabic.variable,
  fontNotoSansHebrew.variable
)
