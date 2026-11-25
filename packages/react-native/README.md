# Fabricator UI for React Native

In an Expo SDK 58 app, use `fabricator-ui init --distribution package` to install the package and its native peers, set up Uniwind and wire the router layout. For manual setup, load `@fabricator-ui/react-native/styles.css` in the app's Uniwind CSS entry, import that entry from the app root, and mount `FabricatorRoot` from `@fabricator-ui/react-native/fabricator-root` around the navigator.

```tsx
import { Button } from "@fabricator-ui/react-native/button"
```

The preview includes Badge, Button, Card, Checkbox, Dialog, Dropdown Menu, Input, Label, Select, Switch, Tabs and Textarea. Package components are generated from the same React Native registry that serves copy-in installs. Update the package in your Expo app workspace. Use [copy-in](https://fabricator-ui.vercel.app/docs/installation/install-methods) to edit component source or use the broader native catalog.
