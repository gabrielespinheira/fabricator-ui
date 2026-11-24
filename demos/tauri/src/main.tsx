import { mountExplorer } from "../../react/src/mount-explorer"
import { hasNativeHost } from "./adapters/native"
import { ServicesPage } from "./services-page"

import "./styles.css"

mountExplorer({
  name: "Tauri",
  status: hasNativeHost() ? "Tauri · Rust host" : "Tauri · Browser preview",
  Services: ServicesPage,
})
