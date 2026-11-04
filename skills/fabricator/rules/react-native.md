# React Native

Check `info --json` first: `project.framework` is `Expo`, or `components.json`'s `@fabricator` registry ends in `/r/fabricator/native/{name}.json`. In a React Native project the CLI installs the native source of each item under the same names. Don't use web patterns here.

## Contents

- Setup
- What stays the same
- What changes
- Do and don't

## Setup

`npx fabricator-ui@latest init` writes `components.json`, the Metro config and the stylesheet's imports, installs the theme, and runs `expo install --fix`. Then the root layout imports the stylesheet once and wraps the app in `FabricatorRoot` from `@/components/ui/fabricator-root`. Without it, overlays don't render and gestures don't work. After `init` or a theme change, restart Metro with `npx expo start --clear`, and rebuild the app if native modules were added.

## What stays the same

- Item names, named exports, `variant` and `size` values, props, parts: `Dialog`, `DialogTrigger`, `DialogContent`.
- Composition with `render` (`<DialogTrigger render={<Button variant="outline" />}>`), and `asChild`.
- State props: `value`, `onValueChange`, `open`, `onOpenChange`, `checked`, `onCheckedChange`.
- Tokens: `bg-primary`, `bg-surface-3`, `text-muted-foreground`, `text-destructive-text`, `shadow-surface-2`. Light and dark come from the tokens.
- `DensityProvider`, and `size="sm"` pinning compact, `size="lg"` spacious.

## What changes

| Web                               | React Native                                                            |
| --------------------------------- | ----------------------------------------------------------------------- |
| `onClick`                         | `onPress`                                                               |
| `onChange` on an input            | `onChangeText`                                                          |
| `<div>`, `<span>`                 | `View`, and `Text` from `@/components/ui/text`                          |
| A string inside any element       | Library containers wrap strings; in a plain `View`, use `Text`          |
| `hover:`                          | `active:`                                                               |
| `focus-visible:`                  | `focus:` on inputs                                                      |
| `group-*`, `has-*`, `peer-*`      | Pass state through props or context                                     |
| `grid`                            | `flex-row flex-wrap`                                                    |
| `truncate`                        | `numberOfLines={1}` on `Text`                                           |
| `motion-*` utilities              | `useMotion`, `useSurfaceAnimation`, `usePressScale` from `@/lib/motion` |
| Icons from `@fabricator-ui/icons` | `@fabricator-ui/icons-react-native`, same names                         |
| `<SoundEffects />`                | Wraps the app, and gives haptics                                        |
| Right click, hover                | A long press opens `ContextMenu`, `Tooltip` and `HoverCard`             |
| `<a href>`                        | `<Link asChild>` from Expo Router around a pressable                    |

The complete list per component is at `/docs/installation/react-native-differences`.

## Do and don't

- **Do** set `accessibilityLabel` on a control with no text, such as an icon button.
- **Do** change the look at runtime with `applyLook` from `@/lib/apply-look` (`add native-theme`), never by writing colours.
- **Don't** import `Text` from `react-native` inside a library control: it won't take the control's text style.
- **Don't** add `tailwind.config`, or edit `fabricator.css` by hand to change one colour: use the look.
- **Don't** use `shadow-sm` and Tailwind's other default shadows for elevation: use `shadow-surface-N`.
