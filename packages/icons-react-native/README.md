# @fabricator-ui/icons-react-native

The [Fabricator UI](https://fabricator-ui.vercel.app) icon library for React Native and Expo, with rounded Outline, Fill and Duotone icons, brand marks and file icons drawn with `react-native-svg`. Browse the [Fabricator catalog](https://fabricator-ui.vercel.app/icons).

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

## File icons

```tsx
import { FileTypeIcon, FileTypescriptIcon } from "@fabricator-ui/icons-react-native/files"

<FileTypeIcon name="page.tsx" />
<FileTypeIcon name="components" kind="folder" open />
<FileTypescriptIcon size={20} />
```

249 file and folder drawings from Charmed Icons (MIT), default size 16px. `getFileIconName` and `getFolderIconName` expose the case-insensitive filename associations. Colours follow the device scheme, or `IconProvider`’s `colorScheme`.

## Licence

Fabricator's code and original artwork are MIT-licensed. Drawings derived from Lucide and Feather carry their upstream notices. See [LICENSE.md](./LICENSE.md).
