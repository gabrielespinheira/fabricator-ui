import {
  BellIcon,
  CalendarIcon,
  HouseIcon,
  MailIcon,
  SearchIcon,
  SettingsIcon,
} from "@fabricator-ui/icons"
import {
  FigmaIcon,
  GithubIcon,
  GoogleIcon,
  InstagramIcon,
  NodeJsIcon,
  SpotifyIcon,
  XIcon,
} from "@fabricator-ui/icons/brands"

const OUTLINE = [
  HouseIcon,
  SearchIcon,
  BellIcon,
  MailIcon,
  CalendarIcon,
  SettingsIcon,
]
const BRANDS = [
  GithubIcon,
  XIcon,
  GoogleIcon,
  InstagramIcon,
  FigmaIcon,
  SpotifyIcon,
  NodeJsIcon,
]
const SIZES = [14, 16, 18, 24]

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <span className="w-28 shrink-0 text-[12px] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </div>
  )
}

/** Outline icons at Fabricator's sizes and strokes, and brands in both colour modes. */
export function IconsShowcase() {
  return (
    <div className="not-prose flex flex-col gap-4 rounded-xl bg-surface-2 p-6 text-foreground shadow-surface-2">
      {SIZES.map((size) => (
        <Row key={size} label={`${size}px, stroke ${size === 24 ? 2 : 1.5}`}>
          {OUTLINE.map((Icon, index) => (
            <Icon key={index} size={size} strokeWidth={size === 24 ? 2 : 1.5} />
          ))}
        </Row>
      ))}
      <Row label="Brands, one colour">
        {BRANDS.map((Icon, index) => (
          <Icon key={index} size={20} />
        ))}
      </Row>
      <Row label='color="brand"'>
        {BRANDS.map((Icon, index) => (
          <Icon key={index} size={20} color="brand" />
        ))}
      </Row>
    </div>
  )
}

/** Brand marks in one colour and in brand colour, side by side. */
export function IconsBrandColors() {
  return (
    <div className="not-prose grid gap-4 rounded-xl bg-surface-2 p-6 text-foreground shadow-surface-2 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <span className="text-[12px] text-muted-foreground">
          One colour (default)
        </span>
        <div className="flex flex-wrap gap-4">
          {BRANDS.map((Icon, index) => (
            <Icon key={index} size={24} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-[12px] text-muted-foreground">
          <code>color=&quot;brand&quot;</code>
        </span>
        <div className="flex flex-wrap gap-4">
          {BRANDS.map((Icon, index) => (
            <Icon key={index} size={24} color="brand" />
          ))}
        </div>
      </div>
    </div>
  )
}
