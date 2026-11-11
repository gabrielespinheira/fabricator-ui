import {
  BoxIcon,
  ChartColumnIcon,
  HomeIcon,
  LayersIcon,
  PanelLeftIcon,
  SparklesIcon,
  TextCursorInputIcon,
} from "./site-icons"

export const EXPLORER_ICONS = {
  overview: HomeIcon,
  groups: {
    Basics: BoxIcon,
    Forms: TextCursorInputIcon,
    Overlays: LayersIcon,
    Structure: PanelLeftIcon,
    Content: ChartColumnIcon,
    Chat: SparklesIcon,
  },
}
