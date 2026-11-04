# @fabricator-ui/icons-react-native

Fabricator Icons for React Native and Expo: every [Lucide](https://lucide.dev) icon under its Lucide name, Fabricator's own Custom icons, and 143 brand marks, drawn with `react-native-svg`. Part of [Fabricator UI](https://fabricator-ui.vercel.app).

```sh
npx expo install @fabricator-ui/icons-react-native react-native-svg
```

## Usage

```tsx
import { HouseIcon, IconProvider } from "@fabricator-ui/icons-react-native"
import { GithubIcon } from "@fabricator-ui/icons-react-native/brands"

<HouseIcon />
<IconProvider color={colors.foreground} size={20} strokeWidth={1.5}>
  <HouseIcon />
  <GithubIcon color="brand" />
</IconProvider>
```

React Native has no colour inheritance, so icons default to the provider's `color`, or else Fabricator's foreground for the device's colour scheme (`#171717` light, `#f5f5f5` dark). They follow light and dark mode with no setup. `IconProvider` takes `color`, `size`, `strokeWidth`, `absoluteStrokeWidth` and `colorScheme` (for apps that pick their own theme).

Props match `@fabricator-ui/icons`. Brand marks accept `color="brand"` for their own colours.

Brand marks are trademarks of their owners. Read [BRANDS.md](./BRANDS.md) before using one.

## Licence

MIT for Fabricator's code and Custom icons; the other outline icons are Lucide's, under ISC. See [LICENSE.md](./LICENSE.md).
