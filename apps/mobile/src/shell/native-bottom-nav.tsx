import * as React from "react"
import { View, type ImageSourcePropType } from "react-native"
import TabView, { useBottomTabBarHeight } from "react-native-bottom-tabs"

import { getMobileTabItems } from "@/registry/fabricator/shared/lib/app-shell-model"
import type { AppNavGroup, AppNavItem } from "@/registry/native/ui/app-nav"

import { getNativeTabIndex } from "../nav-model"
import { useTheme } from "../theme"

const ICONS: Record<
  string,
  {
    focusedIcon: ImageSourcePropType
    unfocusedIcon: ImageSourcePropType
  }
> = {
  overview: {
    focusedIcon: require("../../assets/tab-bar/selected/home.png"),
    unfocusedIcon: require("../../assets/tab-bar/normal/home.png"),
  },
  "component-directory": {
    focusedIcon: require("../../assets/tab-bar/selected/boxes.png"),
    unfocusedIcon: require("../../assets/tab-bar/normal/boxes.png"),
  },
  icons: {
    focusedIcon: require("../../assets/tab-bar/selected/sparkles.png"),
    unfocusedIcon: require("../../assets/tab-bar/normal/sparkles.png"),
  },
}

function BarMeasurement({
  onHeightChange,
}: {
  onHeightChange?: (height: number) => void
}) {
  const height = useBottomTabBarHeight()
  React.useLayoutEffect(() => {
    if (height > 0) onHeightChange?.(height)
  }, [height, onHeightChange])
  return null
}

/** iOS owns the tab bar and its glass; the App Shell keeps page routing. */
export function NativeBottomNav({
  groups,
  activeId,
  onNavigate,
  onHeightChange,
  children,
  isBarHidden = false,
}: {
  groups: AppNavGroup[]
  activeId: string | null
  onNavigate: (item: AppNavItem) => void
  onHeightChange?: (height: number) => void
  children: React.ReactNode
  isBarHidden?: boolean
}) {
  const theme = useTheme()
  const items = React.useMemo(() => getMobileTabItems(groups), [groups])
  const routes = React.useMemo(
    () =>
      items.map((item) => ({
        key: item.id,
        title: item.label,
        ...ICONS[item.id],
      })),
    [items]
  )
  const [lastIndex, setLastIndex] = React.useState(0)
  const index = getNativeTabIndex(items, activeId, lastIndex)
  React.useLayoutEffect(() => {
    setLastIndex(index)
  }, [index])
  const selectedKey = routes[index].key

  return (
    <View className="flex-1">
      <TabView
        navigationState={{
          index,
          routes,
        }}
        onIndexChange={(index) => onNavigate(items[index])}
        renderScene={({ route }) => (
          <>
            {route.key === selectedKey ? children : null}
            <BarMeasurement onHeightChange={onHeightChange} />
          </>
        )}
        getSceneStyle={() => ({ backgroundColor: theme.colors.main })}
        tabBarActiveTintColor={theme.colors.foreground}
        minimizeBehavior="never"
        tabBarHidden={isBarHidden}
        scrollEdgeAppearance="default"
        hapticFeedbackEnabled
        translucent
      />
    </View>
  )
}
