import {
  BoxIcon,
  ChartColumnIcon,
  HomeIcon,
  LayersIcon,
  NewspaperIcon,
  PanelLeftIcon,
  SparklesIcon,
  TextCursorInputIcon,
  ZapIcon,
} from "./site-icons"

export const EXPLORER_ICONS = {
  overview: HomeIcon,
  groups: {
    Basics: BoxIcon,
    Forms: TextCursorInputIcon,
    Overlays: LayersIcon,
    Structure: PanelLeftIcon,
    Content: NewspaperIcon,
    Charts: ChartColumnIcon,
    Chat: SparklesIcon,
    Advanced: ZapIcon,
  },
}
