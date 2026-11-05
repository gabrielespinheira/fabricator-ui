---
"fabricator-ui": minor
---

Give React Native tablets their own sizes. `FabricatorRoot` picks them from the window's width: 40pt controls with the phone's 15pt text and 18pt icons, `sm` at 34pt, `lg` at 48pt and `xs` at 28pt, with touch targets staying at 44pt. Split View narrower than 768pt uses the phone's sizes, and a density picked on purpose stays. On tablets the App Shell gets a 288pt sidebar, a 32pt page title and a sidebar toggle that stays in the header, and row actions wait for the current row or a trackpad's hover. A calendar keeps its size unless it's given `w-full`, and inputs give way in a row instead of overflowing it.
