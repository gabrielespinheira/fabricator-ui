export const registry = {
  "name": "Fabricator UI",
  "homepage": "https://fabricator-ui.vercel.app",
  "items": [
    {
      "name": "index",
      "dependencies": [
        "class-variance-authority",
        "cn",
        "lucide-react",
        "@base-ui/react"
      ],
      "devDependencies": [
        "tw-animate-css",
        "shadcn"
      ],
      "registryDependencies": [
        "utils"
      ],
      "files": [],
      "cssVars": {},
      "css": {
        "@import \"tw-animate-css\"": {},
        "@import \"shadcn/tailwind.css\"": {},
        "@layer base": {
          "*": {
            "@apply border-border outline-ring/50": {}
          },
          "body": {
            "@apply bg-background text-foreground": {}
          }
        }
      },
      "type": "registry:style"
    },
    {
      "name": "style",
      "dependencies": [
        "class-variance-authority",
        "cn",
        "lucide-react",
        "@base-ui/react"
      ],
      "devDependencies": [
        "tw-animate-css",
        "shadcn"
      ],
      "registryDependencies": [
        "utils"
      ],
      "files": [],
      "cssVars": {},
      "css": {
        "@import \"tw-animate-css\"": {},
        "@import \"shadcn/tailwind.css\"": {},
        "@layer base": {
          "*": {
            "@apply border-border outline-ring/50": {}
          },
          "body": {
            "@apply bg-background text-foreground": {}
          }
        }
      },
      "type": "registry:style"
    },
    {
      "name": "accordion",
      "files": [
        {
          "path": "ui/accordion.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/accordion",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/accordion-example.tsx",
          "api": "https://base-ui.com/react/components/accordion.md"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "fluid-hover"
      ]
    },
    {
      "name": "alert",
      "files": [
        {
          "path": "ui/alert.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/alert",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/alert-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "alert-dialog",
      "registryDependencies": [
        "button",
        "density"
      ],
      "files": [
        {
          "path": "ui/alert-dialog.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/alert-dialog",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/alert-dialog-example.tsx",
          "api": "https://base-ui.com/react/components/alert-dialog.md"
        }
      },
      "type": "registry:ui",
      "dependencies": []
    },
    {
      "name": "aspect-ratio",
      "files": [
        {
          "path": "ui/aspect-ratio.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/aspect-ratio",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/aspect-ratio-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "avatar",
      "files": [
        {
          "path": "ui/avatar.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/avatar",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/avatar-example.tsx",
          "api": "https://base-ui.com/react/components/avatar.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "badge",
      "files": [
        {
          "path": "ui/badge.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/badge",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/badge-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "breadcrumb",
      "files": [
        {
          "path": "ui/breadcrumb.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/breadcrumb",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/breadcrumb-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "button",
      "files": [
        {
          "path": "ui/button.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/button",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/button-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "button-group",
      "registryDependencies": [
        "separator"
      ],
      "files": [
        {
          "path": "ui/button-group.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/button-group",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/button-group-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "calendar",
      "dependencies": [
        "react-day-picker@latest",
        "date-fns"
      ],
      "registryDependencies": [
        "button",
        "select"
      ],
      "files": [
        {
          "path": "ui/calendar.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/calendar",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/calendar-example.tsx",
          "api": "https://react-day-picker.js.org"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "card",
      "files": [
        {
          "path": "ui/card.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/card",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/card-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "carousel",
      "dependencies": [
        "embla-carousel-react"
      ],
      "registryDependencies": [
        "button"
      ],
      "files": [
        {
          "path": "ui/carousel.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/carousel",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/carousel-example.tsx",
          "api": "https://www.embla-carousel.com/get-started/react"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "checkbox",
      "files": [
        {
          "path": "ui/checkbox.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/checkbox",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/checkbox-example.tsx",
          "api": "https://base-ui.com/react/components/checkbox.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "collapsible",
      "files": [
        {
          "path": "ui/collapsible.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/collapsible",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/collapsible-example.tsx",
          "api": "https://base-ui.com/react/components/collapsible.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "combobox",
      "dependencies": [
        "@base-ui/react"
      ],
      "registryDependencies": [
        "button",
        "input-group",
        "fluid-hover",
        "density"
      ],
      "files": [
        {
          "path": "ui/combobox.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/combobox",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/combobox-example.tsx",
          "api": "https://base-ui.com/react/components/combobox.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "command",
      "dependencies": [
        "cmdk"
      ],
      "registryDependencies": [
        "dialog",
        "input-group",
        "fluid-hover"
      ],
      "files": [
        {
          "path": "ui/command.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/command",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/command-example.tsx",
          "api": "https://github.com/dip/cmdk"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "context-menu",
      "files": [
        {
          "path": "ui/context-menu.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/context-menu",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/context-menu-example.tsx",
          "api": "https://base-ui.com/react/components/context-menu.md"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "fluid-hover",
        "density"
      ]
    },
    {
      "name": "dialog",
      "registryDependencies": [
        "button",
        "density"
      ],
      "files": [
        {
          "path": "ui/dialog.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/dialog",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/dialog-example.tsx",
          "api": "https://base-ui.com/react/components/dialog.md"
        }
      },
      "type": "registry:ui",
      "dependencies": []
    },
    {
      "name": "drawer",
      "dependencies": [
        "@base-ui/react"
      ],
      "files": [
        {
          "path": "ui/drawer.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/drawer",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/drawer-example.tsx",
          "api": "https://base-ui.com/react/components/drawer.md"
        }
      },
      "type": "registry:ui",
      "registryDependencies": [
        "density"
      ]
    },
    {
      "name": "dropdown-menu",
      "files": [
        {
          "path": "ui/dropdown-menu.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/dropdown-menu",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/dropdown-menu-example.tsx",
          "api": "https://base-ui.com/react/components/menu.md"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "fluid-hover",
        "density"
      ]
    },
    {
      "name": "empty",
      "files": [
        {
          "path": "ui/empty.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/empty",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/empty-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "field",
      "registryDependencies": [
        "label",
        "separator"
      ],
      "files": [
        {
          "path": "ui/field.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/field",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/field-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "form",
      "type": "registry:ui"
    },
    {
      "name": "hover-card",
      "files": [
        {
          "path": "ui/hover-card.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/hover-card",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/hover-card-example.tsx",
          "api": "https://base-ui.com/react/components/hover-card.md"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "density"
      ]
    },
    {
      "name": "input",
      "files": [
        {
          "path": "ui/input.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/input",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/input-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "input-group",
      "registryDependencies": [
        "button",
        "input",
        "textarea"
      ],
      "files": [
        {
          "path": "ui/input-group.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/input-group",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/input-group-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "input-otp",
      "dependencies": [
        "input-otp"
      ],
      "files": [
        {
          "path": "ui/input-otp.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/input-otp",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/input-otp-example.tsx",
          "api": "https://input-otp.rodz.dev"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "item",
      "registryDependencies": [
        "separator"
      ],
      "files": [
        {
          "path": "ui/item.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/item",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/item-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "label",
      "files": [
        {
          "path": "ui/label.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/label",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/label-example.tsx",
          "api": "https://base-ui.com/react/components/label.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "menubar",
      "registryDependencies": [
        "dropdown-menu",
        "fluid-hover",
        "density"
      ],
      "files": [
        {
          "path": "ui/menubar.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/menubar",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/menubar-example.tsx",
          "api": "https://base-ui.com/react/components/menubar.md"
        }
      },
      "type": "registry:ui",
      "dependencies": []
    },
    {
      "name": "navigation-menu",
      "files": [
        {
          "path": "ui/navigation-menu.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/navigation-menu",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/navigation-menu-example.tsx",
          "api": "https://base-ui.com/react/components/navigation-menu.md"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "fluid-hover",
        "density"
      ]
    },
    {
      "name": "pagination",
      "registryDependencies": [
        "button"
      ],
      "files": [
        {
          "path": "ui/pagination.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/pagination",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/pagination-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "popover",
      "files": [
        {
          "path": "ui/popover.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/popover",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/popover-example.tsx",
          "api": "https://base-ui.com/react/components/popover.md"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "density"
      ]
    },
    {
      "name": "progress",
      "files": [
        {
          "path": "ui/progress.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/progress",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/progress-example.tsx",
          "api": "https://base-ui.com/react/components/progress.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "radio-group",
      "files": [
        {
          "path": "ui/radio-group.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/radio-group",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/radio-group-example.tsx",
          "api": "https://base-ui.com/react/components/radio-group.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "resizable",
      "dependencies": [
        "react-resizable-panels"
      ],
      "files": [
        {
          "path": "ui/resizable.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/resizable",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/resizable-example.tsx",
          "api": "https://github.com/bvaughn/react-resizable-panels"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "scroll-area",
      "files": [
        {
          "path": "ui/scroll-area.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/scroll-area",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/scroll-area-example.tsx",
          "api": "https://base-ui.com/react/components/scroll-area.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "select",
      "files": [
        {
          "path": "ui/select.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/select",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/select-example.tsx",
          "api": "https://base-ui.com/react/components/select.md"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "fluid-hover",
        "density"
      ]
    },
    {
      "name": "separator",
      "files": [
        {
          "path": "ui/separator.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/separator",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/separator-example.tsx",
          "api": "https://base-ui.com/react/components/separator.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "sheet",
      "registryDependencies": [
        "button",
        "density"
      ],
      "files": [
        {
          "path": "ui/sheet.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/sheet",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/sheet-example.tsx",
          "api": "https://base-ui.com/react/components/dialog.md"
        }
      },
      "type": "registry:ui",
      "dependencies": []
    },
    {
      "name": "sidebar",
      "registryDependencies": [
        "button",
        "input",
        "separator",
        "sheet",
        "skeleton",
        "tooltip",
        "use-mobile",
        "fluid-hover",
        "kbd",
        "sidebar-model"
      ],
      "files": [
        {
          "path": "ui/sidebar.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/sidebar",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/sidebar-example.tsx"
        }
      },
      "type": "registry:ui",
      "dependencies": []
    },
    {
      "name": "skeleton",
      "files": [
        {
          "path": "ui/skeleton.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/skeleton",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/skeleton-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "slider",
      "files": [
        {
          "path": "ui/slider.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/slider",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/slider-example.tsx",
          "api": "https://base-ui.com/react/components/slider.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "sonner",
      "dependencies": [
        "sonner",
        "next-themes"
      ],
      "files": [
        {
          "path": "ui/sonner.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/sonner",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/sonner-example.tsx",
          "api": "https://sonner.emilkowal.ski"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "spinner",
      "files": [
        {
          "path": "ui/spinner.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/spinner",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/spinner-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "switch",
      "files": [
        {
          "path": "ui/switch.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/switch",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/switch-example.tsx",
          "api": "https://base-ui.com/react/components/switch.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "table",
      "files": [
        {
          "path": "ui/table.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/table",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/table-example.tsx"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "fluid-hover"
      ]
    },
    {
      "name": "tabs",
      "files": [
        {
          "path": "ui/tabs.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/tabs",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/tabs-example.tsx",
          "api": "https://base-ui.com/react/components/tabs.md"
        }
      },
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "fluid-hover"
      ]
    },
    {
      "name": "textarea",
      "files": [
        {
          "path": "ui/textarea.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/textarea",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/textarea-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "toast",
      "dependencies": [
        "@base-ui/react"
      ],
      "registryDependencies": [
        "button"
      ],
      "files": [
        {
          "path": "ui/toast.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/toast",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/toast-example.tsx",
          "api": "https://base-ui.com/react/components/toast.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "toggle",
      "files": [
        {
          "path": "ui/toggle.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/toggle",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/toggle-example.tsx",
          "api": "https://base-ui.com/react/components/toggle.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "toggle-group",
      "registryDependencies": [
        "toggle",
        "fluid-hover"
      ],
      "files": [
        {
          "path": "ui/toggle-group.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/toggle-group",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/toggle-group-example.tsx",
          "api": "https://base-ui.com/react/components/toggle-group.md"
        }
      },
      "type": "registry:ui",
      "dependencies": []
    },
    {
      "name": "tooltip",
      "files": [
        {
          "path": "ui/tooltip.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/tooltip",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/tooltip-example.tsx",
          "api": "https://base-ui.com/react/components/tooltip.md"
        }
      },
      "docs": "The `tooltip` component has been added. Remember to wrap your app with the `TooltipProvider` component.\n\n```tsx title=\"app/layout.tsx\"\nimport { TooltipProvider } from \"@/components/ui/tooltip\"\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>\n        <TooltipProvider>{children}</TooltipProvider>\n      </body>\n    </html>\n  )\n}\n```\n",
      "type": "registry:ui",
      "dependencies": [],
      "registryDependencies": [
        "density"
      ]
    },
    {
      "name": "kbd",
      "files": [
        {
          "path": "ui/kbd.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/kbd",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/kbd-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "direction",
      "dependencies": [
        "@base-ui/react"
      ],
      "files": [
        {
          "path": "ui/direction.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/direction",
          "api": "https://base-ui.com/react/utils/direction-provider.md"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "attachment",
      "registryDependencies": [
        "button"
      ],
      "files": [
        {
          "path": "ui/attachment.tsx",
          "type": "registry:ui"
        }
      ],
      "type": "registry:ui"
    },
    {
      "name": "bubble",
      "files": [
        {
          "path": "ui/bubble.tsx",
          "type": "registry:ui"
        }
      ],
      "type": "registry:ui"
    },
    {
      "name": "message-scroller",
      "dependencies": [
        "@shadcn/react"
      ],
      "registryDependencies": [
        "button"
      ],
      "files": [
        {
          "path": "ui/message-scroller.tsx",
          "type": "registry:ui"
        }
      ],
      "type": "registry:ui"
    },
    {
      "name": "questionnaire",
      "dependencies": [
        "@shadcn/react"
      ],
      "registryDependencies": [
        "button"
      ],
      "files": [
        {
          "path": "ui/questionnaire.tsx",
          "type": "registry:ui"
        }
      ],
      "meta": {
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/questionnaire",
          "examples": "https://fabricator-ui.vercel.app/code/apps/web/registry/bases/base/examples/questionnaire-example.tsx"
        }
      },
      "type": "registry:ui"
    },
    {
      "name": "marker",
      "files": [
        {
          "path": "ui/marker.tsx",
          "type": "registry:ui"
        }
      ],
      "type": "registry:ui"
    },
    {
      "name": "message",
      "files": [
        {
          "path": "ui/message.tsx",
          "type": "registry:ui"
        }
      ],
      "type": "registry:ui"
    },
    {
      "name": "accordion-example",
      "title": "Accordion",
      "registryDependencies": [
        "accordion",
        "button",
        "card",
        "example"
      ],
      "files": [
        {
          "path": "examples/accordion-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "alert-example",
      "title": "Alert",
      "registryDependencies": [
        "alert",
        "badge",
        "example"
      ],
      "files": [
        {
          "path": "examples/alert-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "alert-dialog-example",
      "title": "Alert Dialog",
      "registryDependencies": [
        "alert-dialog",
        "button",
        "dialog",
        "example"
      ],
      "files": [
        {
          "path": "examples/alert-dialog-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "aspect-ratio-example",
      "title": "Aspect Ratio",
      "registryDependencies": [
        "aspect-ratio",
        "example"
      ],
      "files": [
        {
          "path": "examples/aspect-ratio-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "avatar-example",
      "title": "Avatar",
      "registryDependencies": [
        "avatar",
        "button",
        "empty",
        "example"
      ],
      "files": [
        {
          "path": "examples/avatar-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "badge-example",
      "title": "Badge",
      "registryDependencies": [
        "badge",
        "spinner",
        "example"
      ],
      "files": [
        {
          "path": "examples/badge-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "breadcrumb-example",
      "title": "Breadcrumb",
      "registryDependencies": [
        "breadcrumb",
        "dropdown-menu",
        "example"
      ],
      "files": [
        {
          "path": "examples/breadcrumb-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "button-example",
      "title": "Button",
      "registryDependencies": [
        "button",
        "example"
      ],
      "files": [
        {
          "path": "examples/button-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "button-group-example",
      "title": "Button Group",
      "registryDependencies": [
        "button",
        "button-group",
        "dropdown-menu",
        "field",
        "input",
        "input-group",
        "label",
        "popover",
        "select",
        "tooltip",
        "example"
      ],
      "files": [
        {
          "path": "examples/button-group-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "calendar-example",
      "title": "Calendar",
      "registryDependencies": [
        "button",
        "calendar",
        "card",
        "field",
        "input",
        "label",
        "popover",
        "example"
      ],
      "files": [
        {
          "path": "examples/calendar-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "card-example",
      "title": "Card",
      "registryDependencies": [
        "avatar",
        "button",
        "card",
        "field",
        "input",
        "example"
      ],
      "files": [
        {
          "path": "examples/card-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "carousel-example",
      "title": "Carousel",
      "registryDependencies": [
        "card",
        "carousel",
        "example"
      ],
      "files": [
        {
          "path": "examples/carousel-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "checkbox-example",
      "title": "Checkbox",
      "registryDependencies": [
        "checkbox",
        "field",
        "table",
        "example"
      ],
      "files": [
        {
          "path": "examples/checkbox-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "collapsible-example",
      "title": "Collapsible",
      "registryDependencies": [
        "button",
        "card",
        "collapsible",
        "field",
        "input",
        "tabs",
        "example"
      ],
      "files": [
        {
          "path": "examples/collapsible-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "combobox-example",
      "title": "Combobox",
      "registryDependencies": [
        "button",
        "card",
        "combobox",
        "dialog",
        "field",
        "input",
        "input-group",
        "item",
        "select",
        "example"
      ],
      "files": [
        {
          "path": "examples/combobox-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "command-example",
      "title": "Command",
      "registryDependencies": [
        "button",
        "command",
        "example"
      ],
      "files": [
        {
          "path": "examples/command-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "context-menu-example",
      "title": "Context Menu",
      "registryDependencies": [
        "button",
        "context-menu",
        "dialog",
        "example"
      ],
      "files": [
        {
          "path": "examples/context-menu-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "dialog-example",
      "title": "Dialog",
      "registryDependencies": [
        "button",
        "checkbox",
        "dialog",
        "field",
        "input",
        "input-group",
        "kbd",
        "select",
        "switch",
        "tabs",
        "textarea",
        "tooltip",
        "example"
      ],
      "files": [
        {
          "path": "examples/dialog-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "drawer-example",
      "title": "Drawer",
      "registryDependencies": [
        "drawer",
        "example"
      ],
      "files": [
        {
          "path": "examples/drawer-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "dropdown-menu-example",
      "title": "Dropdown Menu",
      "registryDependencies": [
        "avatar",
        "button",
        "dialog",
        "dropdown-menu",
        "example"
      ],
      "files": [
        {
          "path": "examples/dropdown-menu-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "empty-example",
      "title": "Empty",
      "registryDependencies": [
        "button",
        "empty",
        "input-group",
        "kbd",
        "example"
      ],
      "files": [
        {
          "path": "examples/empty-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "field-example",
      "title": "Field",
      "registryDependencies": [
        "badge",
        "checkbox",
        "field",
        "input",
        "input-otp",
        "select",
        "radio-group",
        "slider",
        "switch",
        "textarea",
        "example"
      ],
      "files": [
        {
          "path": "examples/field-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "hover-card-example",
      "title": "Hover Card",
      "registryDependencies": [
        "button",
        "dialog",
        "hover-card",
        "example"
      ],
      "files": [
        {
          "path": "examples/hover-card-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "input-example",
      "title": "Input",
      "registryDependencies": [
        "button",
        "field",
        "input",
        "select",
        "example"
      ],
      "files": [
        {
          "path": "examples/input-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "input-group-example",
      "title": "Input Group",
      "registryDependencies": [
        "button",
        "button-group",
        "card",
        "dropdown-menu",
        "field",
        "input",
        "input-group",
        "kbd",
        "popover",
        "spinner",
        "textarea",
        "tooltip",
        "example"
      ],
      "files": [
        {
          "path": "examples/input-group-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "input-otp-example",
      "title": "Input OTP",
      "registryDependencies": [
        "button",
        "card",
        "field",
        "input-otp",
        "example"
      ],
      "files": [
        {
          "path": "examples/input-otp-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "item-example",
      "title": "Item",
      "registryDependencies": [
        "button",
        "item",
        "example"
      ],
      "files": [
        {
          "path": "examples/item-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "kbd-example",
      "title": "Kbd",
      "registryDependencies": [
        "button",
        "input-group",
        "kbd",
        "tooltip",
        "example"
      ],
      "files": [
        {
          "path": "examples/kbd-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "label-example",
      "title": "Label",
      "registryDependencies": [
        "checkbox",
        "field",
        "input",
        "label",
        "textarea",
        "example"
      ],
      "files": [
        {
          "path": "examples/label-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "menubar-example",
      "title": "Menubar",
      "registryDependencies": [
        "button",
        "dialog",
        "menubar",
        "example"
      ],
      "files": [
        {
          "path": "examples/menubar-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "navigation-menu-example",
      "title": "Navigation Menu",
      "registryDependencies": [
        "button",
        "dialog",
        "navigation-menu",
        "example"
      ],
      "files": [
        {
          "path": "examples/navigation-menu-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "pagination-example",
      "title": "Pagination",
      "registryDependencies": [
        "field",
        "pagination",
        "select",
        "example"
      ],
      "files": [
        {
          "path": "examples/pagination-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "popover-example",
      "title": "Popover",
      "registryDependencies": [
        "button",
        "dialog",
        "field",
        "input",
        "popover",
        "example"
      ],
      "files": [
        {
          "path": "examples/popover-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "progress-example",
      "title": "Progress",
      "registryDependencies": [
        "field",
        "item",
        "progress",
        "slider",
        "example"
      ],
      "files": [
        {
          "path": "examples/progress-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "radio-group-example",
      "title": "Radio Group",
      "registryDependencies": [
        "field",
        "radio-group",
        "example"
      ],
      "files": [
        {
          "path": "examples/radio-group-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "resizable-example",
      "title": "Resizable",
      "registryDependencies": [
        "resizable",
        "example"
      ],
      "files": [
        {
          "path": "examples/resizable-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "scroll-area-example",
      "title": "Scroll Area",
      "registryDependencies": [
        "scroll-area",
        "separator",
        "example"
      ],
      "files": [
        {
          "path": "examples/scroll-area-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "select-example",
      "title": "Select",
      "registryDependencies": [
        "button",
        "dialog",
        "field",
        "input",
        "item",
        "select",
        "example"
      ],
      "files": [
        {
          "path": "examples/select-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "separator-example",
      "title": "Separator",
      "registryDependencies": [
        "separator",
        "example"
      ],
      "files": [
        {
          "path": "examples/separator-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "sheet-example",
      "title": "Sheet",
      "registryDependencies": [
        "button",
        "field",
        "input",
        "sheet",
        "example"
      ],
      "files": [
        {
          "path": "examples/sheet-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "sidebar-example",
      "title": "Sidebar",
      "registryDependencies": [
        "button",
        "dropdown-menu",
        "item",
        "label",
        "sidebar",
        "example"
      ],
      "files": [
        {
          "path": "examples/sidebar-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "sidebar-icon-example",
      "title": "Sidebar (Icon)",
      "registryDependencies": [
        "avatar",
        "button",
        "collapsible",
        "dropdown-menu",
        "item",
        "sidebar",
        "example"
      ],
      "files": [
        {
          "path": "examples/sidebar-icon-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "sidebar-inset-example",
      "title": "Sidebar (Inset)",
      "registryDependencies": [
        "collapsible",
        "sidebar",
        "example"
      ],
      "files": [
        {
          "path": "examples/sidebar-inset-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "sidebar-floating-example",
      "title": "Sidebar (Floating)",
      "registryDependencies": [
        "button",
        "card",
        "dropdown-menu",
        "field",
        "item",
        "sidebar",
        "example"
      ],
      "files": [
        {
          "path": "examples/sidebar-floating-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "skeleton-example",
      "title": "Skeleton",
      "registryDependencies": [
        "skeleton",
        "example"
      ],
      "files": [
        {
          "path": "examples/skeleton-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "slider-example",
      "title": "Slider",
      "registryDependencies": [
        "label",
        "slider",
        "example"
      ],
      "files": [
        {
          "path": "examples/slider-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "sonner-example",
      "title": "Sonner",
      "registryDependencies": [
        "sonner",
        "example"
      ],
      "files": [
        {
          "path": "examples/sonner-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "spinner-example",
      "title": "Spinner",
      "registryDependencies": [
        "badge",
        "button",
        "empty",
        "field",
        "input-group",
        "spinner",
        "example"
      ],
      "files": [
        {
          "path": "examples/spinner-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "switch-example",
      "title": "Switch",
      "registryDependencies": [
        "field",
        "label",
        "switch",
        "example"
      ],
      "files": [
        {
          "path": "examples/switch-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "table-example",
      "title": "Table",
      "registryDependencies": [
        "button",
        "dropdown-menu",
        "input",
        "select",
        "table",
        "example"
      ],
      "files": [
        {
          "path": "examples/table-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "tabs-example",
      "title": "Tabs",
      "registryDependencies": [
        "button",
        "dropdown-menu",
        "tabs",
        "example"
      ],
      "files": [
        {
          "path": "examples/tabs-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "textarea-example",
      "title": "Textarea",
      "registryDependencies": [
        "field",
        "textarea",
        "example"
      ],
      "files": [
        {
          "path": "examples/textarea-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "toast-example",
      "title": "Toast",
      "registryDependencies": [
        "button",
        "toast",
        "example"
      ],
      "files": [
        {
          "path": "examples/toast-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "toggle-example",
      "title": "Toggle",
      "registryDependencies": [
        "toggle",
        "example"
      ],
      "files": [
        {
          "path": "examples/toggle-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "toggle-group-example",
      "title": "Toggle Group",
      "registryDependencies": [
        "input",
        "select",
        "toggle-group",
        "example"
      ],
      "files": [
        {
          "path": "examples/toggle-group-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "tooltip-example",
      "title": "Tooltip",
      "registryDependencies": [
        "button",
        "kbd",
        "tooltip",
        "example"
      ],
      "files": [
        {
          "path": "examples/tooltip-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "demo",
      "title": "Demo",
      "registryDependencies": [
        "alert-dialog",
        "badge",
        "button",
        "button-group",
        "card",
        "checkbox",
        "dropdown-menu",
        "field",
        "input-group",
        "item",
        "radio-group",
        "slider",
        "switch",
        "textarea"
      ],
      "files": [
        {
          "path": "examples/demo.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "component-example",
      "title": "Example",
      "registryDependencies": [
        "alert-dialog",
        "badge",
        "button",
        "card",
        "combobox",
        "dropdown-menu",
        "field",
        "input",
        "select",
        "textarea",
        "example"
      ],
      "files": [
        {
          "path": "examples/component-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "attachment-example",
      "title": "Attachment",
      "registryDependencies": [
        "attachment",
        "button",
        "dialog",
        "example",
        "spinner"
      ],
      "files": [
        {
          "path": "examples/attachment-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "bubble-example",
      "title": "Bubble",
      "registryDependencies": [
        "bubble",
        "button",
        "collapsible",
        "example",
        "marker",
        "sonner"
      ],
      "files": [
        {
          "path": "examples/bubble-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "message-scroller-example",
      "title": "Message Scroller",
      "registryDependencies": [
        "attachment",
        "bubble",
        "button",
        "card",
        "example",
        "input-group",
        "marker",
        "message",
        "message-scroller",
        "spinner"
      ],
      "files": [
        {
          "path": "examples/message-scroller-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "questionnaire-example",
      "title": "Questionnaire",
      "registryDependencies": [
        "button",
        "card",
        "dialog",
        "example",
        "questionnaire",
        "sonner"
      ],
      "files": [
        {
          "path": "examples/questionnaire-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "marker-example",
      "title": "Marker",
      "registryDependencies": [
        "marker",
        "button",
        "accordion",
        "drawer",
        "spinner",
        "example"
      ],
      "files": [
        {
          "path": "examples/marker-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "message-example",
      "title": "Message",
      "registryDependencies": [
        "bubble",
        "message",
        "button",
        "example"
      ],
      "files": [
        {
          "path": "examples/message-example.tsx",
          "type": "registry:example"
        }
      ],
      "type": "registry:example"
    },
    {
      "name": "utils",
      "dependencies": [
        "cn"
      ],
      "files": [
        {
          "path": "lib/utils.ts",
          "type": "registry:lib"
        }
      ],
      "type": "registry:lib"
    },
    {
      "name": "example",
      "title": "Example",
      "files": [
        {
          "path": "components/example.tsx",
          "type": "registry:component"
        }
      ],
      "type": "registry:component"
    },
    {
      "name": "preview-03",
      "title": "Preview 03",
      "registryDependencies": [],
      "files": [
        {
          "path": "blocks/preview-03/index.tsx",
          "type": "registry:block"
        }
      ],
      "type": "registry:block"
    },
    {
      "name": "login-01",
      "title": "Login 01",
      "description": "A simple login form.",
      "registryDependencies": [
        "button",
        "card",
        "input",
        "label",
        "field"
      ],
      "files": [
        {
          "path": "blocks/login-01/page.tsx",
          "type": "registry:page",
          "target": "app/login/page.tsx"
        },
        {
          "path": "blocks/login-01/components/login-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "login"
      ],
      "type": "registry:block"
    },
    {
      "name": "login-02",
      "title": "Login 02",
      "description": "A two column login page with a cover image.",
      "registryDependencies": [
        "button",
        "input",
        "label",
        "field"
      ],
      "files": [
        {
          "path": "blocks/login-02/page.tsx",
          "type": "registry:page",
          "target": "app/login/page.tsx"
        },
        {
          "path": "blocks/login-02/components/login-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "login"
      ],
      "type": "registry:block"
    },
    {
      "name": "login-03",
      "title": "Login 03",
      "description": "A login page with a muted background color.",
      "registryDependencies": [
        "button",
        "card",
        "input",
        "label",
        "field"
      ],
      "files": [
        {
          "path": "blocks/login-03/page.tsx",
          "type": "registry:page",
          "target": "app/login/page.tsx"
        },
        {
          "path": "blocks/login-03/components/login-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "login"
      ],
      "type": "registry:block"
    },
    {
      "name": "login-04",
      "title": "Login 04",
      "description": "A login page with form and image.",
      "registryDependencies": [
        "button",
        "card",
        "input",
        "label",
        "field"
      ],
      "files": [
        {
          "path": "blocks/login-04/page.tsx",
          "type": "registry:page",
          "target": "app/login/page.tsx"
        },
        {
          "path": "blocks/login-04/components/login-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "login"
      ],
      "type": "registry:block"
    },
    {
      "name": "login-05",
      "title": "Login 05",
      "description": "A simple email-only login page.",
      "registryDependencies": [
        "button",
        "input",
        "label",
        "field"
      ],
      "files": [
        {
          "path": "blocks/login-05/page.tsx",
          "type": "registry:page",
          "target": "app/login/page.tsx"
        },
        {
          "path": "blocks/login-05/components/login-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "login"
      ],
      "type": "registry:block"
    },
    {
      "name": "signup-01",
      "title": "Signup 01",
      "description": "A simple signup form.",
      "registryDependencies": [
        "button",
        "card",
        "input",
        "label"
      ],
      "files": [
        {
          "path": "blocks/signup-01/page.tsx",
          "type": "registry:page",
          "target": "app/signup/page.tsx"
        },
        {
          "path": "blocks/signup-01/components/signup-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "signup"
      ],
      "type": "registry:block"
    },
    {
      "name": "signup-02",
      "title": "Signup 02",
      "description": "A two column signup page with a cover image.",
      "registryDependencies": [
        "button",
        "input",
        "label",
        "field"
      ],
      "files": [
        {
          "path": "blocks/signup-02/page.tsx",
          "type": "registry:page",
          "target": "app/signup/page.tsx"
        },
        {
          "path": "blocks/signup-02/components/signup-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "signup"
      ],
      "type": "registry:block"
    },
    {
      "name": "signup-03",
      "title": "Signup 03",
      "description": "A signup page with a muted background color.",
      "registryDependencies": [
        "button",
        "card",
        "input",
        "label",
        "field"
      ],
      "files": [
        {
          "path": "blocks/signup-03/page.tsx",
          "type": "registry:page",
          "target": "app/signup/page.tsx"
        },
        {
          "path": "blocks/signup-03/components/signup-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "signup"
      ],
      "type": "registry:block"
    },
    {
      "name": "signup-04",
      "title": "Signup 04",
      "description": "A signup page with form and image.",
      "registryDependencies": [
        "button",
        "card",
        "input",
        "label",
        "field"
      ],
      "files": [
        {
          "path": "blocks/signup-04/page.tsx",
          "type": "registry:page",
          "target": "app/signup/page.tsx"
        },
        {
          "path": "blocks/signup-04/components/signup-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "signup"
      ],
      "type": "registry:block"
    },
    {
      "name": "signup-05",
      "title": "Signup 05",
      "description": "A simple signup form with social providers.",
      "registryDependencies": [
        "button",
        "input",
        "label"
      ],
      "files": [
        {
          "path": "blocks/signup-05/page.tsx",
          "type": "registry:page",
          "target": "app/signup/page.tsx"
        },
        {
          "path": "blocks/signup-05/components/signup-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "authentication",
        "signup"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-01",
      "title": "Sidebar 01",
      "description": "A simple sidebar with navigation grouped by section.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "label",
        "dropdown-menu"
      ],
      "files": [
        {
          "path": "blocks/sidebar-01/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-01/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-01/components/search-form.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-01/components/version-switcher.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-02",
      "title": "Sidebar 02",
      "description": "A sidebar with collapsible sections.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "label",
        "dropdown-menu"
      ],
      "files": [
        {
          "path": "blocks/sidebar-02/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-02/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-02/components/search-form.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-02/components/version-switcher.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-03",
      "title": "Sidebar 03",
      "description": "A sidebar with submenus.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb"
      ],
      "files": [
        {
          "path": "blocks/sidebar-03/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-03/components/app-sidebar.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-04",
      "title": "Sidebar 04",
      "description": "A floating sidebar with submenus.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator"
      ],
      "files": [
        {
          "path": "blocks/sidebar-04/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-04/components/app-sidebar.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-05",
      "title": "Sidebar 05",
      "description": "A sidebar with collapsible submenus.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "label",
        "collapsible"
      ],
      "files": [
        {
          "path": "blocks/sidebar-05/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-05/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-05/components/search-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-06",
      "title": "Sidebar 06",
      "description": "A sidebar with submenus as dropdowns.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "card",
        "dropdown-menu"
      ],
      "files": [
        {
          "path": "blocks/sidebar-06/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-06/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-06/components/nav-main.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-06/components/sidebar-opt-in-form.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-07",
      "title": "Sidebar 07",
      "description": "A sidebar that collapses to icons.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "collapsible",
        "dropdown-menu",
        "avatar"
      ],
      "files": [
        {
          "path": "blocks/sidebar-07/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-07/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-07/components/nav-main.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-07/components/nav-projects.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-07/components/nav-user.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-07/components/team-switcher.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-08",
      "title": "Sidebar 08",
      "description": "An inset sidebar with secondary navigation.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "collapsible",
        "dropdown-menu",
        "avatar"
      ],
      "files": [
        {
          "path": "blocks/sidebar-08/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-08/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-08/components/nav-main.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-08/components/nav-projects.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-08/components/nav-secondary.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-08/components/nav-user.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-09",
      "title": "Sidebar 09",
      "description": "Collapsible nested sidebars.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "collapsible",
        "dropdown-menu",
        "avatar",
        "switch",
        "label"
      ],
      "files": [
        {
          "path": "blocks/sidebar-09/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-09/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-09/components/nav-user.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-10",
      "title": "Sidebar 10",
      "description": "A sidebar in a popover.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "popover",
        "collapsible",
        "dropdown-menu"
      ],
      "files": [
        {
          "path": "blocks/sidebar-10/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-10/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-10/components/nav-actions.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-10/components/nav-favorites.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-10/components/nav-main.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-10/components/nav-secondary.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-10/components/nav-workspaces.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-10/components/team-switcher.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-11",
      "title": "Sidebar 11",
      "description": "A sidebar with a collapsible file tree.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "collapsible"
      ],
      "files": [
        {
          "path": "blocks/sidebar-11/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-11/components/app-sidebar.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-12",
      "title": "Sidebar 12",
      "description": "A sidebar with a calendar.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "collapsible",
        "calendar",
        "dropdown-menu",
        "avatar"
      ],
      "files": [
        {
          "path": "blocks/sidebar-12/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-12/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-12/components/calendars.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-12/components/date-picker.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-12/components/nav-user.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-13",
      "title": "Sidebar 13",
      "description": "A sidebar in a dialog.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "button",
        "dialog"
      ],
      "files": [
        {
          "path": "blocks/sidebar-13/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-13/components/settings-dialog.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-14",
      "title": "Sidebar 14",
      "description": "A sidebar on the right.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb"
      ],
      "files": [
        {
          "path": "blocks/sidebar-14/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-14/components/app-sidebar.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-15",
      "title": "Sidebar 15",
      "description": "A left and right sidebar.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "popover",
        "collapsible",
        "dropdown-menu",
        "calendar",
        "avatar"
      ],
      "files": [
        {
          "path": "blocks/sidebar-15/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-15/components/calendars.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/date-picker.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/nav-favorites.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/nav-main.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/nav-secondary.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/nav-user.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/nav-workspaces.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/sidebar-left.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/sidebar-right.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-15/components/team-switcher.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "sidebar-16",
      "title": "Sidebar 16",
      "description": "A sidebar with a sticky site header.",
      "registryDependencies": [
        "sidebar",
        "breadcrumb",
        "separator",
        "collapsible",
        "dropdown-menu",
        "avatar",
        "button",
        "label"
      ],
      "files": [
        {
          "path": "blocks/sidebar-16/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        },
        {
          "path": "blocks/sidebar-16/components/app-sidebar.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-16/components/nav-main.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-16/components/nav-projects.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-16/components/nav-secondary.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-16/components/nav-user.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-16/components/search-form.tsx",
          "type": "registry:component"
        },
        {
          "path": "blocks/sidebar-16/components/site-header.tsx",
          "type": "registry:component"
        }
      ],
      "categories": [
        "sidebar",
        "dashboard"
      ],
      "type": "registry:block"
    },
    {
      "name": "use-mobile",
      "files": [
        {
          "path": "hooks/use-mobile.ts",
          "type": "registry:hook"
        }
      ],
      "type": "registry:hook"
    },
    {
      "name": "font-geist",
      "title": "Geist",
      "type": "registry:font",
      "font": {
        "family": "'Geist Variable', sans-serif",
        "provider": "google",
        "import": "Geist",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/geist"
      }
    },
    {
      "name": "font-inter",
      "title": "Inter",
      "type": "registry:font",
      "font": {
        "family": "'Inter Variable', sans-serif",
        "provider": "google",
        "import": "Inter",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/inter"
      }
    },
    {
      "name": "font-noto-sans",
      "title": "Noto Sans",
      "type": "registry:font",
      "font": {
        "family": "'Noto Sans Variable', sans-serif",
        "provider": "google",
        "import": "Noto_Sans",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/noto-sans"
      }
    },
    {
      "name": "font-nunito-sans",
      "title": "Nunito Sans",
      "type": "registry:font",
      "font": {
        "family": "'Nunito Sans Variable', sans-serif",
        "provider": "google",
        "import": "Nunito_Sans",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/nunito-sans"
      }
    },
    {
      "name": "font-figtree",
      "title": "Figtree",
      "type": "registry:font",
      "font": {
        "family": "'Figtree Variable', sans-serif",
        "provider": "google",
        "import": "Figtree",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/figtree"
      }
    },
    {
      "name": "font-roboto",
      "title": "Roboto",
      "type": "registry:font",
      "font": {
        "family": "'Roboto Variable', sans-serif",
        "provider": "google",
        "import": "Roboto",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/roboto"
      }
    },
    {
      "name": "font-raleway",
      "title": "Raleway",
      "type": "registry:font",
      "font": {
        "family": "'Raleway Variable', sans-serif",
        "provider": "google",
        "import": "Raleway",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/raleway"
      }
    },
    {
      "name": "font-dm-sans",
      "title": "DM Sans",
      "type": "registry:font",
      "font": {
        "family": "'DM Sans Variable', sans-serif",
        "provider": "google",
        "import": "DM_Sans",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/dm-sans"
      }
    },
    {
      "name": "font-public-sans",
      "title": "Public Sans",
      "type": "registry:font",
      "font": {
        "family": "'Public Sans Variable', sans-serif",
        "provider": "google",
        "import": "Public_Sans",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/public-sans"
      }
    },
    {
      "name": "font-outfit",
      "title": "Outfit",
      "type": "registry:font",
      "font": {
        "family": "'Outfit Variable', sans-serif",
        "provider": "google",
        "import": "Outfit",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/outfit"
      }
    },
    {
      "name": "font-oxanium",
      "title": "Oxanium",
      "type": "registry:font",
      "font": {
        "family": "'Oxanium Variable', sans-serif",
        "provider": "google",
        "import": "Oxanium",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/oxanium"
      }
    },
    {
      "name": "font-manrope",
      "title": "Manrope",
      "type": "registry:font",
      "font": {
        "family": "'Manrope Variable', sans-serif",
        "provider": "google",
        "import": "Manrope",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/manrope"
      }
    },
    {
      "name": "font-space-grotesk",
      "title": "Space Grotesk",
      "type": "registry:font",
      "font": {
        "family": "'Space Grotesk Variable', sans-serif",
        "provider": "google",
        "import": "Space_Grotesk",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/space-grotesk"
      }
    },
    {
      "name": "font-montserrat",
      "title": "Montserrat",
      "type": "registry:font",
      "font": {
        "family": "'Montserrat Variable', sans-serif",
        "provider": "google",
        "import": "Montserrat",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/montserrat"
      }
    },
    {
      "name": "font-ibm-plex-sans",
      "title": "IBM Plex Sans",
      "type": "registry:font",
      "font": {
        "family": "'IBM Plex Sans Variable', sans-serif",
        "provider": "google",
        "import": "IBM_Plex_Sans",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/ibm-plex-sans"
      }
    },
    {
      "name": "font-source-sans-3",
      "title": "Source Sans 3",
      "type": "registry:font",
      "font": {
        "family": "'Source Sans 3 Variable', sans-serif",
        "provider": "google",
        "import": "Source_Sans_3",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/source-sans-3"
      }
    },
    {
      "name": "font-instrument-sans",
      "title": "Instrument Sans",
      "type": "registry:font",
      "font": {
        "family": "'Instrument Sans Variable', sans-serif",
        "provider": "google",
        "import": "Instrument_Sans",
        "variable": "--font-sans",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/instrument-sans"
      }
    },
    {
      "name": "font-jetbrains-mono",
      "title": "JetBrains Mono",
      "type": "registry:font",
      "font": {
        "family": "'JetBrains Mono Variable', monospace",
        "provider": "google",
        "import": "JetBrains_Mono",
        "variable": "--font-mono",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/jetbrains-mono"
      }
    },
    {
      "name": "font-geist-mono",
      "title": "Geist Mono",
      "type": "registry:font",
      "font": {
        "family": "'Geist Mono Variable', monospace",
        "provider": "google",
        "import": "Geist_Mono",
        "variable": "--font-mono",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/geist-mono"
      }
    },
    {
      "name": "font-noto-serif",
      "title": "Noto Serif",
      "type": "registry:font",
      "font": {
        "family": "'Noto Serif Variable', serif",
        "provider": "google",
        "import": "Noto_Serif",
        "variable": "--font-serif",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/noto-serif"
      }
    },
    {
      "name": "font-roboto-slab",
      "title": "Roboto Slab",
      "type": "registry:font",
      "font": {
        "family": "'Roboto Slab Variable', serif",
        "provider": "google",
        "import": "Roboto_Slab",
        "variable": "--font-serif",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/roboto-slab"
      }
    },
    {
      "name": "font-merriweather",
      "title": "Merriweather",
      "type": "registry:font",
      "font": {
        "family": "'Merriweather Variable', serif",
        "provider": "google",
        "import": "Merriweather",
        "variable": "--font-serif",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/merriweather"
      }
    },
    {
      "name": "font-lora",
      "title": "Lora",
      "type": "registry:font",
      "font": {
        "family": "'Lora Variable', serif",
        "provider": "google",
        "import": "Lora",
        "variable": "--font-serif",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/lora"
      }
    },
    {
      "name": "font-playfair-display",
      "title": "Playfair Display",
      "type": "registry:font",
      "font": {
        "family": "'Playfair Display Variable', serif",
        "provider": "google",
        "import": "Playfair_Display",
        "variable": "--font-serif",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/playfair-display"
      }
    },
    {
      "name": "font-eb-garamond",
      "title": "EB Garamond",
      "type": "registry:font",
      "font": {
        "family": "'EB Garamond Variable', serif",
        "provider": "google",
        "import": "EB_Garamond",
        "variable": "--font-serif",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/eb-garamond"
      }
    },
    {
      "name": "font-instrument-serif",
      "title": "Instrument Serif",
      "type": "registry:font",
      "font": {
        "family": "'Instrument Serif', serif",
        "provider": "google",
        "import": "Instrument_Serif",
        "variable": "--font-serif",
        "weight": [
          "400"
        ],
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource/instrument-serif"
      }
    },
    {
      "name": "font-heading-geist",
      "title": "Geist (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Geist Variable', sans-serif",
        "provider": "google",
        "import": "Geist",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/geist"
      }
    },
    {
      "name": "font-heading-inter",
      "title": "Inter (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Inter Variable', sans-serif",
        "provider": "google",
        "import": "Inter",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/inter"
      }
    },
    {
      "name": "font-heading-noto-sans",
      "title": "Noto Sans (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Noto Sans Variable', sans-serif",
        "provider": "google",
        "import": "Noto_Sans",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/noto-sans"
      }
    },
    {
      "name": "font-heading-nunito-sans",
      "title": "Nunito Sans (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Nunito Sans Variable', sans-serif",
        "provider": "google",
        "import": "Nunito_Sans",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/nunito-sans"
      }
    },
    {
      "name": "font-heading-figtree",
      "title": "Figtree (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Figtree Variable', sans-serif",
        "provider": "google",
        "import": "Figtree",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/figtree"
      }
    },
    {
      "name": "font-heading-roboto",
      "title": "Roboto (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Roboto Variable', sans-serif",
        "provider": "google",
        "import": "Roboto",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/roboto"
      }
    },
    {
      "name": "font-heading-raleway",
      "title": "Raleway (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Raleway Variable', sans-serif",
        "provider": "google",
        "import": "Raleway",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/raleway"
      }
    },
    {
      "name": "font-heading-dm-sans",
      "title": "DM Sans (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'DM Sans Variable', sans-serif",
        "provider": "google",
        "import": "DM_Sans",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/dm-sans"
      }
    },
    {
      "name": "font-heading-public-sans",
      "title": "Public Sans (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Public Sans Variable', sans-serif",
        "provider": "google",
        "import": "Public_Sans",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/public-sans"
      }
    },
    {
      "name": "font-heading-outfit",
      "title": "Outfit (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Outfit Variable', sans-serif",
        "provider": "google",
        "import": "Outfit",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/outfit"
      }
    },
    {
      "name": "font-heading-oxanium",
      "title": "Oxanium (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Oxanium Variable', sans-serif",
        "provider": "google",
        "import": "Oxanium",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/oxanium"
      }
    },
    {
      "name": "font-heading-manrope",
      "title": "Manrope (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Manrope Variable', sans-serif",
        "provider": "google",
        "import": "Manrope",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/manrope"
      }
    },
    {
      "name": "font-heading-space-grotesk",
      "title": "Space Grotesk (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Space Grotesk Variable', sans-serif",
        "provider": "google",
        "import": "Space_Grotesk",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/space-grotesk"
      }
    },
    {
      "name": "font-heading-montserrat",
      "title": "Montserrat (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Montserrat Variable', sans-serif",
        "provider": "google",
        "import": "Montserrat",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/montserrat"
      }
    },
    {
      "name": "font-heading-ibm-plex-sans",
      "title": "IBM Plex Sans (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'IBM Plex Sans Variable', sans-serif",
        "provider": "google",
        "import": "IBM_Plex_Sans",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/ibm-plex-sans"
      }
    },
    {
      "name": "font-heading-source-sans-3",
      "title": "Source Sans 3 (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Source Sans 3 Variable', sans-serif",
        "provider": "google",
        "import": "Source_Sans_3",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/source-sans-3"
      }
    },
    {
      "name": "font-heading-instrument-sans",
      "title": "Instrument Sans (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Instrument Sans Variable', sans-serif",
        "provider": "google",
        "import": "Instrument_Sans",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/instrument-sans"
      }
    },
    {
      "name": "font-heading-jetbrains-mono",
      "title": "JetBrains Mono (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'JetBrains Mono Variable', monospace",
        "provider": "google",
        "import": "JetBrains_Mono",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/jetbrains-mono"
      }
    },
    {
      "name": "font-heading-geist-mono",
      "title": "Geist Mono (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Geist Mono Variable', monospace",
        "provider": "google",
        "import": "Geist_Mono",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/geist-mono"
      }
    },
    {
      "name": "font-heading-noto-serif",
      "title": "Noto Serif (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Noto Serif Variable', serif",
        "provider": "google",
        "import": "Noto_Serif",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/noto-serif"
      }
    },
    {
      "name": "font-heading-roboto-slab",
      "title": "Roboto Slab (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Roboto Slab Variable', serif",
        "provider": "google",
        "import": "Roboto_Slab",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/roboto-slab"
      }
    },
    {
      "name": "font-heading-merriweather",
      "title": "Merriweather (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Merriweather Variable', serif",
        "provider": "google",
        "import": "Merriweather",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/merriweather"
      }
    },
    {
      "name": "font-heading-lora",
      "title": "Lora (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Lora Variable', serif",
        "provider": "google",
        "import": "Lora",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/lora"
      }
    },
    {
      "name": "font-heading-playfair-display",
      "title": "Playfair Display (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Playfair Display Variable', serif",
        "provider": "google",
        "import": "Playfair_Display",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/playfair-display"
      }
    },
    {
      "name": "font-heading-eb-garamond",
      "title": "EB Garamond (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'EB Garamond Variable', serif",
        "provider": "google",
        "import": "EB_Garamond",
        "variable": "--font-heading",
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource-variable/eb-garamond"
      }
    },
    {
      "name": "font-heading-instrument-serif",
      "title": "Instrument Serif (Heading)",
      "type": "registry:font",
      "font": {
        "family": "'Instrument Serif', serif",
        "provider": "google",
        "import": "Instrument_Serif",
        "variable": "--font-heading",
        "weight": [
          "400"
        ],
        "subsets": [
          "latin"
        ],
        "dependency": "@fontsource/instrument-serif"
      }
    },
    {
      "name": "foundations",
      "type": "registry:lib",
      "title": "Foundations",
      "description": "Fabricator surfaces, colour roles, interaction tokens, focus colour, motion, densities and scrollbars.",
      "cssVars": {
        "theme": {
          "color-surface-1": "var(--surface-1)",
          "shadow-surface-1": "var(--shadow-1)",
          "color-surface-2": "var(--surface-2)",
          "shadow-surface-2": "var(--shadow-2)",
          "color-surface-3": "var(--surface-3)",
          "shadow-surface-3": "var(--shadow-3)",
          "color-surface-4": "var(--surface-4)",
          "shadow-surface-4": "var(--shadow-4)",
          "color-surface-5": "var(--surface-5)",
          "shadow-surface-5": "var(--shadow-5)",
          "color-surface-6": "var(--surface-6)",
          "shadow-surface-6": "var(--shadow-6)",
          "color-surface-7": "var(--surface-7)",
          "shadow-surface-7": "var(--shadow-7)",
          "color-surface-8": "var(--surface-8)",
          "shadow-surface-8": "var(--shadow-8)",
          "color-hover": "var(--hover)",
          "color-active": "var(--active)",
          "color-selected": "var(--selected)",
          "color-tint": "var(--tint)",
          "color-tint-hover": "var(--tint-hover)",
          "color-primary-text": "var(--primary-text)",
          "color-primary-border": "var(--primary-border)",
          "color-primary-surface-1": "var(--primary-surface-1)",
          "color-primary-surface-2": "var(--primary-surface-2)",
          "color-primary-surface-3": "var(--primary-surface-3)",
          "color-primary-surface-4": "var(--primary-surface-4)",
          "color-primary-surface-5": "var(--primary-surface-5)",
          "color-primary-surface-6": "var(--primary-surface-6)",
          "color-primary-surface-7": "var(--primary-surface-7)",
          "color-primary-surface-8": "var(--primary-surface-8)",
          "color-secondary-text": "var(--secondary-text)",
          "color-secondary-border": "var(--secondary-border)",
          "color-secondary-surface-1": "var(--secondary-surface-1)",
          "color-secondary-surface-2": "var(--secondary-surface-2)",
          "color-secondary-surface-3": "var(--secondary-surface-3)",
          "color-secondary-surface-4": "var(--secondary-surface-4)",
          "color-secondary-surface-5": "var(--secondary-surface-5)",
          "color-secondary-surface-6": "var(--secondary-surface-6)",
          "color-secondary-surface-7": "var(--secondary-surface-7)",
          "color-secondary-surface-8": "var(--secondary-surface-8)",
          "color-info": "var(--info)",
          "color-info-foreground": "var(--info-foreground)",
          "color-info-text": "var(--info-text)",
          "color-info-border": "var(--info-border)",
          "color-info-surface-1": "var(--info-surface-1)",
          "color-info-surface-2": "var(--info-surface-2)",
          "color-info-surface-3": "var(--info-surface-3)",
          "color-info-surface-4": "var(--info-surface-4)",
          "color-info-surface-5": "var(--info-surface-5)",
          "color-info-surface-6": "var(--info-surface-6)",
          "color-info-surface-7": "var(--info-surface-7)",
          "color-info-surface-8": "var(--info-surface-8)",
          "color-success": "var(--success)",
          "color-success-foreground": "var(--success-foreground)",
          "color-success-text": "var(--success-text)",
          "color-success-border": "var(--success-border)",
          "color-success-surface-1": "var(--success-surface-1)",
          "color-success-surface-2": "var(--success-surface-2)",
          "color-success-surface-3": "var(--success-surface-3)",
          "color-success-surface-4": "var(--success-surface-4)",
          "color-success-surface-5": "var(--success-surface-5)",
          "color-success-surface-6": "var(--success-surface-6)",
          "color-success-surface-7": "var(--success-surface-7)",
          "color-success-surface-8": "var(--success-surface-8)",
          "color-warning": "var(--warning)",
          "color-warning-foreground": "var(--warning-foreground)",
          "color-warning-text": "var(--warning-text)",
          "color-warning-border": "var(--warning-border)",
          "color-warning-surface-1": "var(--warning-surface-1)",
          "color-warning-surface-2": "var(--warning-surface-2)",
          "color-warning-surface-3": "var(--warning-surface-3)",
          "color-warning-surface-4": "var(--warning-surface-4)",
          "color-warning-surface-5": "var(--warning-surface-5)",
          "color-warning-surface-6": "var(--warning-surface-6)",
          "color-warning-surface-7": "var(--warning-surface-7)",
          "color-warning-surface-8": "var(--warning-surface-8)",
          "color-destructive-foreground": "var(--destructive-foreground)",
          "color-destructive-text": "var(--destructive-text)",
          "color-destructive-border": "var(--destructive-border)",
          "color-destructive-surface-1": "var(--destructive-surface-1)",
          "color-destructive-surface-2": "var(--destructive-surface-2)",
          "color-destructive-surface-3": "var(--destructive-surface-3)",
          "color-destructive-surface-4": "var(--destructive-surface-4)",
          "color-destructive-surface-5": "var(--destructive-surface-5)",
          "color-destructive-surface-6": "var(--destructive-surface-6)",
          "color-destructive-surface-7": "var(--destructive-surface-7)",
          "color-destructive-surface-8": "var(--destructive-surface-8)",
          "color-focus-ring": "var(--focus-ring)",
          "transition-duration-feedback": "calc(var(--motion-feedback) * var(--motion-scale, 1))",
          "transition-duration-feedback-exit": "calc(var(--motion-feedback-exit) * var(--motion-scale, 1))",
          "transition-delay-feedback": "calc(var(--motion-feedback) * var(--motion-scale, 1))",
          "transition-duration-glide": "calc(var(--motion-glide) * var(--motion-scale, 1))",
          "transition-duration-glide-exit": "calc(var(--motion-glide-exit) * var(--motion-scale, 1))",
          "transition-delay-glide": "calc(var(--motion-glide) * var(--motion-scale, 1))",
          "transition-duration-move": "calc(var(--motion-move) * var(--motion-scale, 1))",
          "transition-duration-move-exit": "calc(var(--motion-move-exit) * var(--motion-scale, 1))",
          "transition-delay-move": "calc(var(--motion-move) * var(--motion-scale, 1))",
          "transition-duration-tooltip": "calc(var(--motion-tooltip) * var(--motion-scale, 1))",
          "transition-duration-tooltip-exit": "calc(var(--motion-tooltip-exit) * var(--motion-scale, 1))",
          "transition-delay-tooltip": "calc(var(--motion-tooltip) * var(--motion-scale, 1))",
          "transition-duration-popup": "calc(var(--motion-popup) * var(--motion-scale, 1))",
          "transition-duration-popup-exit": "calc(var(--motion-popup-exit) * var(--motion-scale, 1))",
          "transition-delay-popup": "calc(var(--motion-popup) * var(--motion-scale, 1))",
          "transition-duration-dialog": "calc(var(--motion-dialog) * var(--motion-scale, 1))",
          "transition-duration-dialog-exit": "calc(var(--motion-dialog-exit) * var(--motion-scale, 1))",
          "transition-delay-dialog": "calc(var(--motion-dialog) * var(--motion-scale, 1))",
          "transition-duration-sheet": "calc(var(--motion-sheet) * var(--motion-scale, 1))",
          "transition-duration-sheet-exit": "calc(var(--motion-sheet-exit) * var(--motion-scale, 1))",
          "transition-delay-sheet": "calc(var(--motion-sheet) * var(--motion-scale, 1))",
          "transition-duration-disclosure": "calc(var(--motion-disclosure) * var(--motion-scale, 1))",
          "transition-duration-disclosure-exit": "calc(var(--motion-disclosure-exit) * var(--motion-scale, 1))",
          "transition-delay-disclosure": "calc(var(--motion-disclosure) * var(--motion-scale, 1))",
          "transition-duration-toast": "calc(var(--motion-toast) * var(--motion-scale, 1))",
          "transition-duration-toast-exit": "calc(var(--motion-toast-exit) * var(--motion-scale, 1))",
          "transition-delay-toast": "calc(var(--motion-toast) * var(--motion-scale, 1))",
          "transition-duration-fast": "calc(var(--motion-feedback) * var(--motion-scale, 1))",
          "transition-duration-fast-exit": "calc(var(--motion-feedback-exit) * var(--motion-scale, 1))",
          "transition-delay-fast": "calc(var(--motion-feedback) * var(--motion-scale, 1))",
          "transition-duration-moderate": "calc(var(--motion-move) * var(--motion-scale, 1))",
          "transition-duration-moderate-exit": "calc(var(--motion-move-exit) * var(--motion-scale, 1))",
          "transition-delay-moderate": "calc(var(--motion-move) * var(--motion-scale, 1))",
          "transition-duration-slow": "calc(var(--motion-dialog) * var(--motion-scale, 1))",
          "transition-duration-slow-exit": "calc(var(--motion-dialog-exit) * var(--motion-scale, 1))",
          "transition-delay-slow": "calc(var(--motion-dialog) * var(--motion-scale, 1))",
          "ease-enter": "var(--motion-ease-enter)",
          "ease-move": "var(--motion-ease-move)",
          "ease-exit": "var(--motion-ease-exit)",
          "ease-feedback": "var(--motion-ease-feedback)",
          "ease-drawer": "var(--motion-ease-drawer)",
          "ease-spring": "var(--motion-ease-enter)",
          "ease-spring-bounce": "var(--motion-ease-enter)"
        },
        "light": {
          "surface-hue": "0",
          "surface-chroma": "0",
          "motion-scale": "1",
          "motion-feedback": "150ms",
          "motion-feedback-exit": "100ms",
          "motion-glide": "150ms",
          "motion-glide-exit": "100ms",
          "motion-move": "250ms",
          "motion-move-exit": "180ms",
          "motion-tooltip": "125ms",
          "motion-tooltip-exit": "90ms",
          "motion-popup": "180ms",
          "motion-popup-exit": "120ms",
          "motion-dialog": "250ms",
          "motion-dialog-exit": "180ms",
          "motion-sheet": "400ms",
          "motion-sheet-exit": "250ms",
          "motion-disclosure": "200ms",
          "motion-disclosure-exit": "150ms",
          "motion-toast": "350ms",
          "motion-toast-exit": "220ms",
          "motion-ease-enter": "cubic-bezier(0.23, 1, 0.32, 1)",
          "motion-ease-move": "cubic-bezier(0.77, 0, 0.175, 1)",
          "motion-ease-exit": "cubic-bezier(0.23, 1, 0.32, 1)",
          "motion-ease-feedback": "cubic-bezier(0.25, 0.1, 0.25, 1)",
          "motion-ease-drawer": "cubic-bezier(0.32, 0.72, 0, 1)",
          "motion-press-scale": "0.97",
          "motion-tooltip-scale": "0.97",
          "motion-popup-scale": "0.95",
          "motion-dialog-scale": "0.95",
          "motion-tooltip-travel": "0px",
          "motion-popup-travel": "0px",
          "motion-popup-blur": "0px",
          "density-4": "0.25rem",
          "density-6": "0.375rem",
          "density-8": "0.5rem",
          "density-10": "0.625rem",
          "density-12": "0.75rem",
          "density-14": "0.875rem",
          "density-16": "1rem",
          "density-20": "1.25rem",
          "density-24": "1.5rem",
          "density-28": "1.75rem",
          "density-30": "1.875rem",
          "density-32": "2rem",
          "density-36": "2.25rem",
          "density-40": "2.5rem",
          "density-48": "3rem",
          "density-text-11": "11px",
          "density-text-12": "12px",
          "density-text-13": "13px",
          "density-text-14": "14px",
          "density-text-16": "16px",
          "density-icon-14": "0.875rem",
          "density-icon-16": "1rem",
          "surface-1": "oklch(calc(0.985 - var(--surface-chroma) * 0.575) calc(var(--surface-chroma) * 0.44) var(--surface-hue))",
          "shadow-1": "0 0 0 1px var(--shadow-color)",
          "surface-2": "oklch(calc(0.991 - var(--surface-chroma) * 0.625) calc(var(--surface-chroma) * 0.395) var(--surface-hue))",
          "shadow-2": "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color)",
          "surface-3": "oklch(calc(1 - var(--surface-chroma) * 0.775) calc(var(--surface-chroma) * 0.36) var(--surface-hue))",
          "shadow-3": "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color)",
          "surface-4": "oklch(calc(1 - var(--surface-chroma) * 0.7) calc(var(--surface-chroma) * 0.325) var(--surface-hue))",
          "shadow-4": "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color)",
          "surface-5": "oklch(calc(1 - var(--surface-chroma) * 0.625) calc(var(--surface-chroma) * 0.29) var(--surface-hue))",
          "shadow-5": "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color), 0 12px 12px -6px var(--shadow-color)",
          "surface-6": "oklch(calc(1 - var(--surface-chroma) * 0.575) calc(var(--surface-chroma) * 0.265) var(--surface-hue))",
          "shadow-6": "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color), 0 12px 12px -6px var(--shadow-color), 0 24px 24px -12px var(--shadow-color)",
          "surface-7": "oklch(calc(1 - var(--surface-chroma) * 0.525) calc(var(--surface-chroma) * 0.24) var(--surface-hue))",
          "shadow-7": "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color), 0 12px 12px -6px var(--shadow-color), 0 24px 24px -12px var(--shadow-color), 0 48px 48px -24px var(--shadow-color)",
          "surface-8": "oklch(calc(1 - var(--surface-chroma) * 0.475) calc(var(--surface-chroma) * 0.215) var(--surface-hue))",
          "shadow-8": "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color), 0 12px 12px -6px var(--shadow-color), 0 24px 24px -12px var(--shadow-color), 0 48px 48px -24px var(--shadow-color), 0 96px 96px -48px var(--shadow-color)",
          "shadow-color": "oklch(0 0 0 / 0.06)",
          "overlay": "0 0 0",
          "hover": "oklch(0 0 0 / 0.04)",
          "active": "oklch(0 0 0 / 0.07)",
          "selected": "oklch(0.87 calc(var(--surface-chroma) * 0.3) var(--surface-hue))",
          "tint": "oklch(0 0 0 / 0.08)",
          "tint-hover": "oklch(0 0 0 / 0.065)",
          "primary-hue": "0",
          "primary-chroma": "0",
          "secondary-hue": "0",
          "secondary-chroma": "0",
          "info-hue": "260",
          "info-chroma": "0.18",
          "success-hue": "150",
          "success-chroma": "0.13",
          "warning-hue": "70",
          "warning-chroma": "0.1",
          "destructive-hue": "25",
          "destructive-chroma": "0.19",
          "primary-text": "oklch(calc(0.205 + 0.245 * min(1, var(--primary-chroma) / 0.06)) calc(var(--primary-chroma) * 0.85 * min(1, var(--primary-chroma) / 0.06)) var(--primary-hue))",
          "primary-border": "oklch(calc(0.205 + 0.275 * min(1, var(--primary-chroma) / 0.06)) calc(var(--primary-chroma) * min(1, var(--primary-chroma) / 0.06)) var(--primary-hue) / calc(0.12 + 0.18 * min(1, var(--primary-chroma) / 0.06)))",
          "primary-surface-1": "oklch(0.97 min(var(--primary-chroma) * 0.35, 0.035) var(--primary-hue))",
          "primary-surface-2": "oklch(0.978 min(var(--primary-chroma) * 0.2975, 0.0298) var(--primary-hue))",
          "primary-surface-3": "oklch(0.986 min(var(--primary-chroma) * 0.252, 0.0252) var(--primary-hue))",
          "primary-surface-4": "oklch(0.99 min(var(--primary-chroma) * 0.217, 0.0217) var(--primary-hue))",
          "primary-surface-5": "oklch(0.993 min(var(--primary-chroma) * 0.189, 0.0189) var(--primary-hue))",
          "primary-surface-6": "oklch(0.995 min(var(--primary-chroma) * 0.168, 0.0168) var(--primary-hue))",
          "primary-surface-7": "oklch(0.997 min(var(--primary-chroma) * 0.1505, 0.0151) var(--primary-hue))",
          "primary-surface-8": "oklch(0.999 min(var(--primary-chroma) * 0.1365, 0.0137) var(--primary-hue))",
          "secondary-text": "oklch(calc(0.205 + 0.245 * min(1, var(--secondary-chroma) / 0.06)) calc(var(--secondary-chroma) * 0.85 * min(1, var(--secondary-chroma) / 0.06)) var(--secondary-hue))",
          "secondary-border": "oklch(calc(0.205 + 0.275 * min(1, var(--secondary-chroma) / 0.06)) calc(var(--secondary-chroma) * min(1, var(--secondary-chroma) / 0.06)) var(--secondary-hue) / calc(0.12 + 0.18 * min(1, var(--secondary-chroma) / 0.06)))",
          "secondary-surface-1": "oklch(0.97 min(var(--secondary-chroma) * 0.35, 0.035) var(--secondary-hue))",
          "secondary-surface-2": "oklch(0.978 min(var(--secondary-chroma) * 0.2975, 0.0298) var(--secondary-hue))",
          "secondary-surface-3": "oklch(0.986 min(var(--secondary-chroma) * 0.252, 0.0252) var(--secondary-hue))",
          "secondary-surface-4": "oklch(0.99 min(var(--secondary-chroma) * 0.217, 0.0217) var(--secondary-hue))",
          "secondary-surface-5": "oklch(0.993 min(var(--secondary-chroma) * 0.189, 0.0189) var(--secondary-hue))",
          "secondary-surface-6": "oklch(0.995 min(var(--secondary-chroma) * 0.168, 0.0168) var(--secondary-hue))",
          "secondary-surface-7": "oklch(0.997 min(var(--secondary-chroma) * 0.1505, 0.0151) var(--secondary-hue))",
          "secondary-surface-8": "oklch(0.999 min(var(--secondary-chroma) * 0.1365, 0.0137) var(--secondary-hue))",
          "info": "oklch(calc(0.205 + 0.275 * min(1, var(--info-chroma) / 0.06)) calc(var(--info-chroma) * min(1, var(--info-chroma) / 0.06)) clamp(215, var(--info-hue), 275))",
          "info-foreground": "oklch(0.985 0 0)",
          "info-text": "oklch(calc(0.205 + 0.245 * min(1, var(--info-chroma) / 0.06)) calc(var(--info-chroma) * 0.85 * min(1, var(--info-chroma) / 0.06)) clamp(215, var(--info-hue), 275))",
          "info-border": "oklch(calc(0.205 + 0.275 * min(1, var(--info-chroma) / 0.06)) calc(var(--info-chroma) * min(1, var(--info-chroma) / 0.06)) clamp(215, var(--info-hue), 275) / calc(0.12 + 0.18 * min(1, var(--info-chroma) / 0.06)))",
          "info-surface-1": "oklch(0.97 min(var(--info-chroma) * 0.35, 0.035) clamp(215, var(--info-hue), 275))",
          "info-surface-2": "oklch(0.978 min(var(--info-chroma) * 0.2975, 0.0298) clamp(215, var(--info-hue), 275))",
          "info-surface-3": "oklch(0.986 min(var(--info-chroma) * 0.252, 0.0252) clamp(215, var(--info-hue), 275))",
          "info-surface-4": "oklch(0.99 min(var(--info-chroma) * 0.217, 0.0217) clamp(215, var(--info-hue), 275))",
          "info-surface-5": "oklch(0.993 min(var(--info-chroma) * 0.189, 0.0189) clamp(215, var(--info-hue), 275))",
          "info-surface-6": "oklch(0.995 min(var(--info-chroma) * 0.168, 0.0168) clamp(215, var(--info-hue), 275))",
          "info-surface-7": "oklch(0.997 min(var(--info-chroma) * 0.1505, 0.0151) clamp(215, var(--info-hue), 275))",
          "info-surface-8": "oklch(0.999 min(var(--info-chroma) * 0.1365, 0.0137) clamp(215, var(--info-hue), 275))",
          "success": "oklch(calc(0.205 + 0.275 * min(1, var(--success-chroma) / 0.06)) calc(var(--success-chroma) * min(1, var(--success-chroma) / 0.06)) clamp(125, var(--success-hue), 175))",
          "success-foreground": "oklch(0.985 0 0)",
          "success-text": "oklch(calc(0.205 + 0.245 * min(1, var(--success-chroma) / 0.06)) calc(var(--success-chroma) * 0.85 * min(1, var(--success-chroma) / 0.06)) clamp(125, var(--success-hue), 175))",
          "success-border": "oklch(calc(0.205 + 0.275 * min(1, var(--success-chroma) / 0.06)) calc(var(--success-chroma) * min(1, var(--success-chroma) / 0.06)) clamp(125, var(--success-hue), 175) / calc(0.12 + 0.18 * min(1, var(--success-chroma) / 0.06)))",
          "success-surface-1": "oklch(0.97 min(var(--success-chroma) * 0.35, 0.035) clamp(125, var(--success-hue), 175))",
          "success-surface-2": "oklch(0.978 min(var(--success-chroma) * 0.2975, 0.0298) clamp(125, var(--success-hue), 175))",
          "success-surface-3": "oklch(0.986 min(var(--success-chroma) * 0.252, 0.0252) clamp(125, var(--success-hue), 175))",
          "success-surface-4": "oklch(0.99 min(var(--success-chroma) * 0.217, 0.0217) clamp(125, var(--success-hue), 175))",
          "success-surface-5": "oklch(0.993 min(var(--success-chroma) * 0.189, 0.0189) clamp(125, var(--success-hue), 175))",
          "success-surface-6": "oklch(0.995 min(var(--success-chroma) * 0.168, 0.0168) clamp(125, var(--success-hue), 175))",
          "success-surface-7": "oklch(0.997 min(var(--success-chroma) * 0.1505, 0.0151) clamp(125, var(--success-hue), 175))",
          "success-surface-8": "oklch(0.999 min(var(--success-chroma) * 0.1365, 0.0137) clamp(125, var(--success-hue), 175))",
          "warning": "oklch(calc(0.205 + 0.275 * min(1, var(--warning-chroma) / 0.06)) calc(var(--warning-chroma) * min(1, var(--warning-chroma) / 0.06)) clamp(45, var(--warning-hue), 100))",
          "warning-foreground": "oklch(0.985 0 0)",
          "warning-text": "oklch(calc(0.205 + 0.245 * min(1, var(--warning-chroma) / 0.06)) calc(var(--warning-chroma) * 0.85 * min(1, var(--warning-chroma) / 0.06)) clamp(45, var(--warning-hue), 100))",
          "warning-border": "oklch(calc(0.205 + 0.275 * min(1, var(--warning-chroma) / 0.06)) calc(var(--warning-chroma) * min(1, var(--warning-chroma) / 0.06)) clamp(45, var(--warning-hue), 100) / calc(0.12 + 0.18 * min(1, var(--warning-chroma) / 0.06)))",
          "warning-surface-1": "oklch(0.97 min(var(--warning-chroma) * 0.35, 0.035) clamp(45, var(--warning-hue), 100))",
          "warning-surface-2": "oklch(0.978 min(var(--warning-chroma) * 0.2975, 0.0298) clamp(45, var(--warning-hue), 100))",
          "warning-surface-3": "oklch(0.986 min(var(--warning-chroma) * 0.252, 0.0252) clamp(45, var(--warning-hue), 100))",
          "warning-surface-4": "oklch(0.99 min(var(--warning-chroma) * 0.217, 0.0217) clamp(45, var(--warning-hue), 100))",
          "warning-surface-5": "oklch(0.993 min(var(--warning-chroma) * 0.189, 0.0189) clamp(45, var(--warning-hue), 100))",
          "warning-surface-6": "oklch(0.995 min(var(--warning-chroma) * 0.168, 0.0168) clamp(45, var(--warning-hue), 100))",
          "warning-surface-7": "oklch(0.997 min(var(--warning-chroma) * 0.1505, 0.0151) clamp(45, var(--warning-hue), 100))",
          "warning-surface-8": "oklch(0.999 min(var(--warning-chroma) * 0.1365, 0.0137) clamp(45, var(--warning-hue), 100))",
          "destructive-foreground": "oklch(0.985 0 0)",
          "destructive-text": "oklch(calc(0.205 + 0.245 * min(1, var(--destructive-chroma) / 0.06)) calc(var(--destructive-chroma) * 0.85 * min(1, var(--destructive-chroma) / 0.06)) clamp(10, var(--destructive-hue), 50))",
          "destructive-border": "oklch(calc(0.205 + 0.275 * min(1, var(--destructive-chroma) / 0.06)) calc(var(--destructive-chroma) * min(1, var(--destructive-chroma) / 0.06)) clamp(10, var(--destructive-hue), 50) / calc(0.12 + 0.18 * min(1, var(--destructive-chroma) / 0.06)))",
          "destructive-surface-1": "oklch(0.97 min(var(--destructive-chroma) * 0.35, 0.035) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-2": "oklch(0.978 min(var(--destructive-chroma) * 0.2975, 0.0298) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-3": "oklch(0.986 min(var(--destructive-chroma) * 0.252, 0.0252) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-4": "oklch(0.99 min(var(--destructive-chroma) * 0.217, 0.0217) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-5": "oklch(0.993 min(var(--destructive-chroma) * 0.189, 0.0189) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-6": "oklch(0.995 min(var(--destructive-chroma) * 0.168, 0.0168) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-7": "oklch(0.997 min(var(--destructive-chroma) * 0.1505, 0.0151) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-8": "oklch(0.999 min(var(--destructive-chroma) * 0.1365, 0.0137) clamp(10, var(--destructive-hue), 50))",
          "focus-ring": "oklch(0.693 0.161 265.2)"
        },
        "dark": {
          "surface-1": "oklch(0.205 calc(var(--surface-chroma) * 0.9) var(--surface-hue))",
          "shadow-1": "inset 0 0 0 1px var(--dm-ring-base)",
          "surface-2": "oklch(0.235 calc(var(--surface-chroma) * 0.85) var(--surface-hue))",
          "shadow-2": "inset 0 1px 0 0 var(--dm-hi-base), inset 0 0 0 1px var(--dm-ring-base), 0 1px 1px -0.5px var(--dm-drop)",
          "surface-3": "oklch(0.264 calc(var(--surface-chroma) * 0.8) var(--surface-hue))",
          "shadow-3": "inset 0 1px 0 0 var(--dm-hi-mid), inset 0 0 0 1px var(--dm-ring-base), 0 0 0 1px oklch(0 0 0 / 0.12), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop)",
          "surface-4": "oklch(0.293 calc(var(--surface-chroma) * 0.75) var(--surface-hue))",
          "shadow-4": "inset 0 1px 0 0 var(--dm-hi-mid), inset 0 0 0 1px var(--dm-ring-mid), 0 0 0 1px oklch(0 0 0 / 0.14), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop)",
          "surface-5": "oklch(0.321 calc(var(--surface-chroma) * 0.7) var(--surface-hue))",
          "shadow-5": "inset 0 1px 0 0 var(--dm-hi-high), inset 0 0 0 1px var(--dm-ring-mid), 0 0 0 1px oklch(0 0 0 / 0.16), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop), 0 12px 12px -6px var(--dm-drop)",
          "surface-6": "oklch(0.348 calc(var(--surface-chroma) * 0.65) var(--surface-hue))",
          "shadow-6": "inset 0 1px 0 0 var(--dm-hi-high), inset 0 0 0 1px var(--dm-ring-high), 0 0 0 1px oklch(0 0 0 / 0.18), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop), 0 12px 12px -6px var(--dm-drop), 0 24px 24px -12px var(--dm-drop)",
          "surface-7": "oklch(0.375 calc(var(--surface-chroma) * 0.6) var(--surface-hue))",
          "shadow-7": "inset 0 1px 0 0 var(--dm-hi-peak), inset 0 0 0 1px var(--dm-ring-high), 0 0 0 1px oklch(0 0 0 / 0.2), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop), 0 12px 12px -6px var(--dm-drop), 0 24px 24px -12px var(--dm-drop), 0 48px 48px -24px var(--dm-drop)",
          "surface-8": "oklch(0.402 calc(var(--surface-chroma) * 0.55) var(--surface-hue))",
          "shadow-8": "inset 0 1px 0 0 var(--dm-hi-peak), inset 0 0 0 1px var(--dm-ring-high), 0 0 0 1px oklch(0 0 0 / 0.22), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop), 0 12px 12px -6px var(--dm-drop), 0 24px 24px -12px var(--dm-drop), 0 48px 48px -24px var(--dm-drop), 0 96px 96px -48px var(--dm-drop)",
          "dm-hi-base": "oklch(1 0 0 / 0.01)",
          "dm-hi-mid": "oklch(1 0 0 / 0.02)",
          "dm-hi-high": "oklch(1 0 0 / 0.04)",
          "dm-hi-peak": "oklch(1 0 0 / 0.06)",
          "dm-ring-base": "oklch(1 0 0 / 0.02)",
          "dm-ring-mid": "oklch(1 0 0 / 0.04)",
          "dm-ring-high": "oklch(1 0 0 / 0.06)",
          "dm-drop": "oklch(0 0 0 / 0.18)",
          "overlay": "255 255 255",
          "hover": "oklch(1 0 0 / 0.06)",
          "active": "oklch(1 0 0 / 0.1)",
          "selected": "oklch(0.439 calc(var(--surface-chroma) * 0.6) var(--surface-hue))",
          "tint": "oklch(1 0 0 / 0.25)",
          "tint-hover": "oklch(1 0 0 / 0.2)",
          "primary-text": "oklch(calc(0.97 - 0.12 * min(1, var(--primary-chroma) / 0.06)) calc(min(var(--primary-chroma), 0.07) * min(1, var(--primary-chroma) / 0.06)) var(--primary-hue))",
          "primary-border": "oklch(calc(0.97 - 0.23 * min(1, var(--primary-chroma) / 0.06)) calc(min(var(--primary-chroma), 0.13) * min(1, var(--primary-chroma) / 0.06)) var(--primary-hue) / calc(0.12 + 0.2 * min(1, var(--primary-chroma) / 0.06)))",
          "primary-surface-1": "oklch(0.215 min(var(--primary-chroma) * 0.4, 0.04) var(--primary-hue))",
          "primary-surface-2": "oklch(0.245 min(var(--primary-chroma) * 0.34, 0.034) var(--primary-hue))",
          "primary-surface-3": "oklch(0.274 min(var(--primary-chroma) * 0.288, 0.0288) var(--primary-hue))",
          "primary-surface-4": "oklch(0.303 min(var(--primary-chroma) * 0.248, 0.0248) var(--primary-hue))",
          "primary-surface-5": "oklch(0.331 min(var(--primary-chroma) * 0.216, 0.0216) var(--primary-hue))",
          "primary-surface-6": "oklch(0.358 min(var(--primary-chroma) * 0.192, 0.0192) var(--primary-hue))",
          "primary-surface-7": "oklch(0.385 min(var(--primary-chroma) * 0.172, 0.0172) var(--primary-hue))",
          "primary-surface-8": "oklch(0.412 min(var(--primary-chroma) * 0.156, 0.0156) var(--primary-hue))",
          "secondary-text": "oklch(calc(0.97 - 0.12 * min(1, var(--secondary-chroma) / 0.06)) calc(min(var(--secondary-chroma), 0.07) * min(1, var(--secondary-chroma) / 0.06)) var(--secondary-hue))",
          "secondary-border": "oklch(calc(0.97 - 0.23 * min(1, var(--secondary-chroma) / 0.06)) calc(min(var(--secondary-chroma), 0.13) * min(1, var(--secondary-chroma) / 0.06)) var(--secondary-hue) / calc(0.12 + 0.2 * min(1, var(--secondary-chroma) / 0.06)))",
          "secondary-surface-1": "oklch(0.215 min(var(--secondary-chroma) * 0.4, 0.04) var(--secondary-hue))",
          "secondary-surface-2": "oklch(0.245 min(var(--secondary-chroma) * 0.34, 0.034) var(--secondary-hue))",
          "secondary-surface-3": "oklch(0.274 min(var(--secondary-chroma) * 0.288, 0.0288) var(--secondary-hue))",
          "secondary-surface-4": "oklch(0.303 min(var(--secondary-chroma) * 0.248, 0.0248) var(--secondary-hue))",
          "secondary-surface-5": "oklch(0.331 min(var(--secondary-chroma) * 0.216, 0.0216) var(--secondary-hue))",
          "secondary-surface-6": "oklch(0.358 min(var(--secondary-chroma) * 0.192, 0.0192) var(--secondary-hue))",
          "secondary-surface-7": "oklch(0.385 min(var(--secondary-chroma) * 0.172, 0.0172) var(--secondary-hue))",
          "secondary-surface-8": "oklch(0.412 min(var(--secondary-chroma) * 0.156, 0.0156) var(--secondary-hue))",
          "info": "oklch(calc(0.97 - 0.23 * min(1, var(--info-chroma) / 0.06)) calc(min(var(--info-chroma), 0.13) * min(1, var(--info-chroma) / 0.06)) clamp(215, var(--info-hue), 275))",
          "info-foreground": "oklch(0.205 0 0)",
          "info-text": "oklch(calc(0.97 - 0.12 * min(1, var(--info-chroma) / 0.06)) calc(min(var(--info-chroma), 0.07) * min(1, var(--info-chroma) / 0.06)) clamp(215, var(--info-hue), 275))",
          "info-border": "oklch(calc(0.97 - 0.23 * min(1, var(--info-chroma) / 0.06)) calc(min(var(--info-chroma), 0.13) * min(1, var(--info-chroma) / 0.06)) clamp(215, var(--info-hue), 275) / calc(0.12 + 0.2 * min(1, var(--info-chroma) / 0.06)))",
          "info-surface-1": "oklch(0.215 min(var(--info-chroma) * 0.4, 0.04) clamp(215, var(--info-hue), 275))",
          "info-surface-2": "oklch(0.245 min(var(--info-chroma) * 0.34, 0.034) clamp(215, var(--info-hue), 275))",
          "info-surface-3": "oklch(0.274 min(var(--info-chroma) * 0.288, 0.0288) clamp(215, var(--info-hue), 275))",
          "info-surface-4": "oklch(0.303 min(var(--info-chroma) * 0.248, 0.0248) clamp(215, var(--info-hue), 275))",
          "info-surface-5": "oklch(0.331 min(var(--info-chroma) * 0.216, 0.0216) clamp(215, var(--info-hue), 275))",
          "info-surface-6": "oklch(0.358 min(var(--info-chroma) * 0.192, 0.0192) clamp(215, var(--info-hue), 275))",
          "info-surface-7": "oklch(0.385 min(var(--info-chroma) * 0.172, 0.0172) clamp(215, var(--info-hue), 275))",
          "info-surface-8": "oklch(0.412 min(var(--info-chroma) * 0.156, 0.0156) clamp(215, var(--info-hue), 275))",
          "success": "oklch(calc(0.97 - 0.23 * min(1, var(--success-chroma) / 0.06)) calc(min(var(--success-chroma), 0.13) * min(1, var(--success-chroma) / 0.06)) clamp(125, var(--success-hue), 175))",
          "success-foreground": "oklch(0.205 0 0)",
          "success-text": "oklch(calc(0.97 - 0.12 * min(1, var(--success-chroma) / 0.06)) calc(min(var(--success-chroma), 0.07) * min(1, var(--success-chroma) / 0.06)) clamp(125, var(--success-hue), 175))",
          "success-border": "oklch(calc(0.97 - 0.23 * min(1, var(--success-chroma) / 0.06)) calc(min(var(--success-chroma), 0.13) * min(1, var(--success-chroma) / 0.06)) clamp(125, var(--success-hue), 175) / calc(0.12 + 0.2 * min(1, var(--success-chroma) / 0.06)))",
          "success-surface-1": "oklch(0.215 min(var(--success-chroma) * 0.4, 0.04) clamp(125, var(--success-hue), 175))",
          "success-surface-2": "oklch(0.245 min(var(--success-chroma) * 0.34, 0.034) clamp(125, var(--success-hue), 175))",
          "success-surface-3": "oklch(0.274 min(var(--success-chroma) * 0.288, 0.0288) clamp(125, var(--success-hue), 175))",
          "success-surface-4": "oklch(0.303 min(var(--success-chroma) * 0.248, 0.0248) clamp(125, var(--success-hue), 175))",
          "success-surface-5": "oklch(0.331 min(var(--success-chroma) * 0.216, 0.0216) clamp(125, var(--success-hue), 175))",
          "success-surface-6": "oklch(0.358 min(var(--success-chroma) * 0.192, 0.0192) clamp(125, var(--success-hue), 175))",
          "success-surface-7": "oklch(0.385 min(var(--success-chroma) * 0.172, 0.0172) clamp(125, var(--success-hue), 175))",
          "success-surface-8": "oklch(0.412 min(var(--success-chroma) * 0.156, 0.0156) clamp(125, var(--success-hue), 175))",
          "warning": "oklch(calc(0.97 - 0.23 * min(1, var(--warning-chroma) / 0.06)) calc(min(var(--warning-chroma), 0.13) * min(1, var(--warning-chroma) / 0.06)) clamp(45, var(--warning-hue), 100))",
          "warning-foreground": "oklch(0.205 0 0)",
          "warning-text": "oklch(calc(0.97 - 0.12 * min(1, var(--warning-chroma) / 0.06)) calc(min(var(--warning-chroma), 0.07) * min(1, var(--warning-chroma) / 0.06)) clamp(45, var(--warning-hue), 100))",
          "warning-border": "oklch(calc(0.97 - 0.23 * min(1, var(--warning-chroma) / 0.06)) calc(min(var(--warning-chroma), 0.13) * min(1, var(--warning-chroma) / 0.06)) clamp(45, var(--warning-hue), 100) / calc(0.12 + 0.2 * min(1, var(--warning-chroma) / 0.06)))",
          "warning-surface-1": "oklch(0.215 min(var(--warning-chroma) * 0.4, 0.04) clamp(45, var(--warning-hue), 100))",
          "warning-surface-2": "oklch(0.245 min(var(--warning-chroma) * 0.34, 0.034) clamp(45, var(--warning-hue), 100))",
          "warning-surface-3": "oklch(0.274 min(var(--warning-chroma) * 0.288, 0.0288) clamp(45, var(--warning-hue), 100))",
          "warning-surface-4": "oklch(0.303 min(var(--warning-chroma) * 0.248, 0.0248) clamp(45, var(--warning-hue), 100))",
          "warning-surface-5": "oklch(0.331 min(var(--warning-chroma) * 0.216, 0.0216) clamp(45, var(--warning-hue), 100))",
          "warning-surface-6": "oklch(0.358 min(var(--warning-chroma) * 0.192, 0.0192) clamp(45, var(--warning-hue), 100))",
          "warning-surface-7": "oklch(0.385 min(var(--warning-chroma) * 0.172, 0.0172) clamp(45, var(--warning-hue), 100))",
          "warning-surface-8": "oklch(0.412 min(var(--warning-chroma) * 0.156, 0.0156) clamp(45, var(--warning-hue), 100))",
          "destructive-foreground": "oklch(0.205 0 0)",
          "destructive-text": "oklch(calc(0.97 - 0.12 * min(1, var(--destructive-chroma) / 0.06)) calc(min(var(--destructive-chroma), 0.07) * min(1, var(--destructive-chroma) / 0.06)) clamp(10, var(--destructive-hue), 50))",
          "destructive-border": "oklch(calc(0.97 - 0.23 * min(1, var(--destructive-chroma) / 0.06)) calc(min(var(--destructive-chroma), 0.13) * min(1, var(--destructive-chroma) / 0.06)) clamp(10, var(--destructive-hue), 50) / calc(0.12 + 0.2 * min(1, var(--destructive-chroma) / 0.06)))",
          "destructive-surface-1": "oklch(0.215 min(var(--destructive-chroma) * 0.4, 0.04) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-2": "oklch(0.245 min(var(--destructive-chroma) * 0.34, 0.034) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-3": "oklch(0.274 min(var(--destructive-chroma) * 0.288, 0.0288) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-4": "oklch(0.303 min(var(--destructive-chroma) * 0.248, 0.0248) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-5": "oklch(0.331 min(var(--destructive-chroma) * 0.216, 0.0216) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-6": "oklch(0.358 min(var(--destructive-chroma) * 0.192, 0.0192) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-7": "oklch(0.385 min(var(--destructive-chroma) * 0.172, 0.0172) clamp(10, var(--destructive-hue), 50))",
          "destructive-surface-8": "oklch(0.412 min(var(--destructive-chroma) * 0.156, 0.0156) clamp(10, var(--destructive-hue), 50))",
          "focus-ring": "oklch(0.693 0.161 265.2)"
        }
      },
      "css": {
        "@layer base": {
          "html": {
            "-webkit-font-smoothing": "antialiased",
            "-moz-osx-font-smoothing": "grayscale",
            "text-rendering": "optimizeLegibility",
            "font-kerning": "normal",
            "font-optical-sizing": "auto",
            "font-synthesis": "none",
            "-webkit-tap-highlight-color": "transparent"
          },
          "@media (pointer: fine)": {
            "*": {
              "scrollbar-width": "thin",
              "scrollbar-color": "rgb(var(--overlay) / 0.08) transparent"
            },
            "::-webkit-scrollbar": {
              "width": "10px",
              "height": "10px"
            },
            "::-webkit-scrollbar-track, ::-webkit-scrollbar-corner": {
              "background": "transparent"
            },
            "::-webkit-scrollbar-thumb": {
              "background-color": "rgb(var(--overlay) / 0.08)",
              "border": "3px solid transparent",
              "background-clip": "content-box",
              "border-radius": "9999px"
            },
            "::-webkit-scrollbar-thumb:vertical": {
              "border-left-width": "1px",
              "border-right-width": "5px"
            },
            "::-webkit-scrollbar-thumb:horizontal": {
              "border-top-width": "1px",
              "border-bottom-width": "5px"
            },
            "::-webkit-scrollbar-thumb:hover": {
              "background-color": "rgb(var(--overlay) / 0.12)"
            },
            "::-webkit-scrollbar-thumb:active": {
              "background-color": "rgb(var(--overlay) / 0.16)"
            }
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, ::before, ::after": {
              "--tw-enter-translate-x": "0 !important",
              "--tw-enter-translate-y": "0 !important",
              "--tw-exit-translate-x": "0 !important",
              "--tw-exit-translate-y": "0 !important",
              "--tw-enter-scale": "1 !important",
              "--tw-exit-scale": "1 !important",
              "--tw-enter-blur": "0 !important",
              "--tw-exit-blur": "0 !important",
              "--motion-press-scale": "1 !important"
            }
          }
        },
        ":root[data-motion=\"smooth\"], [data-motion=\"smooth\"]": {
          "--motion-feedback": "220ms",
          "--motion-feedback-exit": "160ms",
          "--motion-glide": "220ms",
          "--motion-glide-exit": "160ms",
          "--motion-move": "360ms",
          "--motion-move-exit": "260ms",
          "--motion-tooltip": "200ms",
          "--motion-tooltip-exit": "140ms",
          "--motion-popup": "280ms",
          "--motion-popup-exit": "180ms",
          "--motion-dialog": "380ms",
          "--motion-dialog-exit": "240ms",
          "--motion-sheet": "500ms",
          "--motion-sheet-exit": "320ms",
          "--motion-disclosure": "320ms",
          "--motion-disclosure-exit": "240ms",
          "--motion-toast": "450ms",
          "--motion-toast-exit": "300ms",
          "--motion-ease-enter": "cubic-bezier(0.16, 1, 0.3, 1)",
          "--motion-ease-move": "cubic-bezier(0.65, 0, 0.35, 1)",
          "--motion-ease-exit": "cubic-bezier(0.23, 1, 0.32, 1)",
          "--motion-ease-feedback": "cubic-bezier(0.25, 0.1, 0.25, 1)",
          "--motion-ease-drawer": "cubic-bezier(0.32, 0.72, 0, 1)",
          "--motion-press-scale": "0.97",
          "--motion-tooltip-scale": "0.96",
          "--motion-popup-scale": "0.94",
          "--motion-dialog-scale": "0.94",
          "--motion-tooltip-travel": "4px",
          "--motion-popup-travel": "6px",
          "--motion-popup-blur": "2px"
        },
        ":root[data-motion=\"default\"], [data-motion=\"default\"]": {
          "--motion-feedback": "150ms",
          "--motion-feedback-exit": "100ms",
          "--motion-glide": "150ms",
          "--motion-glide-exit": "100ms",
          "--motion-move": "250ms",
          "--motion-move-exit": "180ms",
          "--motion-tooltip": "125ms",
          "--motion-tooltip-exit": "90ms",
          "--motion-popup": "180ms",
          "--motion-popup-exit": "120ms",
          "--motion-dialog": "250ms",
          "--motion-dialog-exit": "180ms",
          "--motion-sheet": "400ms",
          "--motion-sheet-exit": "250ms",
          "--motion-disclosure": "200ms",
          "--motion-disclosure-exit": "150ms",
          "--motion-toast": "350ms",
          "--motion-toast-exit": "220ms",
          "--motion-ease-enter": "cubic-bezier(0.23, 1, 0.32, 1)",
          "--motion-ease-move": "cubic-bezier(0.77, 0, 0.175, 1)",
          "--motion-ease-exit": "cubic-bezier(0.23, 1, 0.32, 1)",
          "--motion-ease-feedback": "cubic-bezier(0.25, 0.1, 0.25, 1)",
          "--motion-ease-drawer": "cubic-bezier(0.32, 0.72, 0, 1)",
          "--motion-press-scale": "0.97",
          "--motion-tooltip-scale": "0.97",
          "--motion-popup-scale": "0.95",
          "--motion-dialog-scale": "0.95",
          "--motion-tooltip-travel": "0px",
          "--motion-popup-travel": "0px",
          "--motion-popup-blur": "0px"
        },
        ":root[data-motion=\"snappy\"], [data-motion=\"snappy\"]": {
          "--motion-feedback": "100ms",
          "--motion-feedback-exit": "70ms",
          "--motion-glide": "110ms",
          "--motion-glide-exit": "80ms",
          "--motion-move": "180ms",
          "--motion-move-exit": "130ms",
          "--motion-tooltip": "100ms",
          "--motion-tooltip-exit": "70ms",
          "--motion-popup": "140ms",
          "--motion-popup-exit": "90ms",
          "--motion-dialog": "180ms",
          "--motion-dialog-exit": "120ms",
          "--motion-sheet": "300ms",
          "--motion-sheet-exit": "200ms",
          "--motion-disclosure": "160ms",
          "--motion-disclosure-exit": "120ms",
          "--motion-toast": "260ms",
          "--motion-toast-exit": "180ms",
          "--motion-ease-enter": "cubic-bezier(0.23, 1, 0.32, 1)",
          "--motion-ease-move": "cubic-bezier(0.77, 0, 0.175, 1)",
          "--motion-ease-exit": "cubic-bezier(0.23, 1, 0.32, 1)",
          "--motion-ease-feedback": "cubic-bezier(0.25, 0.1, 0.25, 1)",
          "--motion-ease-drawer": "cubic-bezier(0.32, 0.72, 0, 1)",
          "--motion-press-scale": "0.98",
          "--motion-tooltip-scale": "0.98",
          "--motion-popup-scale": "0.97",
          "--motion-dialog-scale": "0.97",
          "--motion-tooltip-travel": "0px",
          "--motion-popup-travel": "0px",
          "--motion-popup-blur": "0px"
        },
        ":root[data-motion=\"instant\"], [data-motion=\"instant\"]": {
          "--motion-feedback": "50ms",
          "--motion-feedback-exit": "40ms",
          "--motion-glide": "70ms",
          "--motion-glide-exit": "50ms",
          "--motion-move": "120ms",
          "--motion-move-exit": "90ms",
          "--motion-tooltip": "0ms",
          "--motion-tooltip-exit": "0ms",
          "--motion-popup": "80ms",
          "--motion-popup-exit": "60ms",
          "--motion-dialog": "100ms",
          "--motion-dialog-exit": "80ms",
          "--motion-sheet": "200ms",
          "--motion-sheet-exit": "150ms",
          "--motion-disclosure": "100ms",
          "--motion-disclosure-exit": "80ms",
          "--motion-toast": "180ms",
          "--motion-toast-exit": "120ms",
          "--motion-ease-enter": "cubic-bezier(0.23, 1, 0.32, 1)",
          "--motion-ease-move": "cubic-bezier(0.23, 1, 0.32, 1)",
          "--motion-ease-exit": "cubic-bezier(0.23, 1, 0.32, 1)",
          "--motion-ease-feedback": "cubic-bezier(0.25, 0.1, 0.25, 1)",
          "--motion-ease-drawer": "cubic-bezier(0.32, 0.72, 0, 1)",
          "--motion-press-scale": "1",
          "--motion-tooltip-scale": "1",
          "--motion-popup-scale": "1",
          "--motion-dialog-scale": "1",
          "--motion-tooltip-travel": "0px",
          "--motion-popup-travel": "0px",
          "--motion-popup-blur": "0px"
        },
        ":root[data-motion=\"off\"], [data-motion=\"off\"]": {
          "--motion-scale": "0",
          "--motion-press-scale": "1",
          "--motion-tooltip-scale": "1",
          "--motion-popup-scale": "1",
          "--motion-dialog-scale": "1",
          "--motion-tooltip-travel": "0px",
          "--motion-popup-travel": "0px",
          "--motion-popup-blur": "0px"
        },
        "@utility motion-tooltip": {
          "--tw-enter-scale": "var(--motion-tooltip-scale)",
          "--tw-exit-scale": "var(--motion-tooltip-scale)",
          "--tw-duration": "calc(var(--motion-tooltip) * var(--motion-scale, 1))",
          "--tw-ease": "var(--motion-ease-enter)",
          "&:where([data-closed], [data-state=\"closed\"], [data-exiting], [data-ending-style])": {
            "--tw-duration": "calc(var(--motion-tooltip-exit) * var(--motion-scale, 1))",
            "--tw-ease": "var(--motion-ease-exit)"
          },
          "&:where([data-side=\"bottom\"], [data-placement=\"bottom\"])": {
            "--tw-enter-translate-y": "calc(var(--motion-tooltip-travel) * -1)"
          },
          "&:where([data-side=\"top\"], [data-placement=\"top\"])": {
            "--tw-enter-translate-y": "var(--motion-tooltip-travel)"
          },
          "&:where([data-side=\"right\"], [data-side=\"inline-end\"], [data-placement=\"right\"])": {
            "--tw-enter-translate-x": "calc(var(--motion-tooltip-travel) * -1)"
          },
          "&:where([data-side=\"left\"], [data-side=\"inline-start\"], [data-placement=\"left\"])": {
            "--tw-enter-translate-x": "var(--motion-tooltip-travel)"
          },
          "&:where([data-instant], [data-state=\"instant-open\"])": {
            "--tw-duration": "0s"
          }
        },
        "@utility motion-popup": {
          "--tw-enter-scale": "var(--motion-popup-scale)",
          "--tw-exit-scale": "var(--motion-popup-scale)",
          "--tw-enter-blur": "var(--motion-popup-blur)",
          "--tw-exit-blur": "var(--motion-popup-blur)",
          "--tw-duration": "calc(var(--motion-popup) * var(--motion-scale, 1))",
          "--tw-ease": "var(--motion-ease-enter)",
          "&:where([data-closed], [data-state=\"closed\"], [data-exiting], [data-ending-style])": {
            "--tw-duration": "calc(var(--motion-popup-exit) * var(--motion-scale, 1))",
            "--tw-ease": "var(--motion-ease-exit)"
          },
          "&:where([data-side=\"bottom\"], [data-placement=\"bottom\"])": {
            "--tw-enter-translate-y": "calc(var(--motion-popup-travel) * -1)"
          },
          "&:where([data-side=\"top\"], [data-placement=\"top\"])": {
            "--tw-enter-translate-y": "var(--motion-popup-travel)"
          },
          "&:where([data-side=\"right\"], [data-side=\"inline-end\"], [data-placement=\"right\"])": {
            "--tw-enter-translate-x": "calc(var(--motion-popup-travel) * -1)"
          },
          "&:where([data-side=\"left\"], [data-side=\"inline-start\"], [data-placement=\"left\"])": {
            "--tw-enter-translate-x": "var(--motion-popup-travel)"
          }
        },
        "@utility motion-dialog": {
          "--tw-enter-scale": "var(--motion-dialog-scale)",
          "--tw-exit-scale": "var(--motion-dialog-scale)",
          "--tw-duration": "calc(var(--motion-dialog) * var(--motion-scale, 1))",
          "--tw-ease": "var(--motion-ease-enter)",
          "&:where([data-closed], [data-state=\"closed\"], [data-exiting], [data-ending-style])": {
            "--tw-duration": "calc(var(--motion-dialog-exit) * var(--motion-scale, 1))",
            "--tw-ease": "var(--motion-ease-exit)"
          }
        },
        "@utility motion-scrim": {
          "--tw-duration": "calc(var(--motion-dialog) * var(--motion-scale, 1))",
          "--tw-ease": "var(--motion-ease-enter)",
          "&:where([data-closed], [data-state=\"closed\"], [data-exiting], [data-ending-style])": {
            "--tw-duration": "calc(var(--motion-dialog-exit) * var(--motion-scale, 1))",
            "--tw-ease": "var(--motion-ease-exit)"
          }
        },
        "@utility motion-sheet": {
          "--tw-duration": "calc(var(--motion-sheet) * var(--motion-scale, 1))",
          "--tw-ease": "var(--motion-ease-drawer)",
          "&:where([data-closed], [data-state=\"closed\"], [data-exiting], [data-ending-style])": {
            "--tw-duration": "calc(var(--motion-sheet-exit) * var(--motion-scale, 1))",
            "--tw-ease": "var(--motion-ease-drawer)"
          }
        },
        "@utility motion-disclosure": {
          "--tw-duration": "calc(var(--motion-disclosure) * var(--motion-scale, 1))",
          "--tw-ease": "var(--motion-ease-enter)",
          "&:where([data-closed], [data-state=\"closed\"], [data-exiting], [data-ending-style])": {
            "--tw-duration": "calc(var(--motion-disclosure-exit) * var(--motion-scale, 1))",
            "--tw-ease": "var(--motion-ease-exit)"
          }
        },
        "@utility motion-toast": {
          "--tw-duration": "calc(var(--motion-toast) * var(--motion-scale, 1))",
          "--tw-ease": "var(--motion-ease-enter)",
          "&:where([data-closed], [data-state=\"closed\"], [data-exiting], [data-ending-style])": {
            "--tw-duration": "calc(var(--motion-toast-exit) * var(--motion-scale, 1))",
            "--tw-ease": "var(--motion-ease-exit)"
          }
        },
        "@utility motion-press": {
          "&:active:not(:disabled, [aria-disabled=\"true\"], [data-disabled], :where([data-slot=\"button-group\"], [data-slot=\"input-group\"]) *), &[data-pressed]:not(:where([data-slot=\"button-group\"], [data-slot=\"input-group\"]) *)": {
            "scale": "var(--motion-press-scale)"
          }
        },
        ":root[data-density=\"compact\"], [data-density=\"compact\"]": {
          "--density-4": "0.125rem",
          "--density-6": "0.25rem",
          "--density-8": "0.375rem",
          "--density-10": "0.5rem",
          "--density-12": "0.625rem",
          "--density-14": "0.75rem",
          "--density-16": "0.75rem",
          "--density-20": "1rem",
          "--density-24": "1.25rem",
          "--density-28": "1.5rem",
          "--density-30": "1.625rem",
          "--density-32": "1.75rem",
          "--density-36": "1.75rem",
          "--density-40": "2rem",
          "--density-48": "2.5rem",
          "--density-text-11": "11px",
          "--density-text-12": "12px",
          "--density-text-13": "12px",
          "--density-text-14": "13px",
          "--density-text-16": "15px",
          "--density-icon-14": "0.75rem",
          "--density-icon-16": "0.875rem"
        },
        ":root[data-density=\"default\"], [data-density=\"default\"]": {
          "--density-4": "0.25rem",
          "--density-6": "0.375rem",
          "--density-8": "0.5rem",
          "--density-10": "0.625rem",
          "--density-12": "0.75rem",
          "--density-14": "0.875rem",
          "--density-16": "1rem",
          "--density-20": "1.25rem",
          "--density-24": "1.5rem",
          "--density-28": "1.75rem",
          "--density-30": "1.875rem",
          "--density-32": "2rem",
          "--density-36": "2.25rem",
          "--density-40": "2.5rem",
          "--density-48": "3rem",
          "--density-text-11": "11px",
          "--density-text-12": "12px",
          "--density-text-13": "13px",
          "--density-text-14": "14px",
          "--density-text-16": "16px",
          "--density-icon-14": "0.875rem",
          "--density-icon-16": "1rem"
        },
        ":root[data-density=\"spacious\"], [data-density=\"spacious\"]": {
          "--density-4": "0.25rem",
          "--density-6": "0.5rem",
          "--density-8": "0.625rem",
          "--density-10": "0.75rem",
          "--density-12": "0.875rem",
          "--density-14": "1rem",
          "--density-16": "1.25rem",
          "--density-20": "1.5rem",
          "--density-24": "1.75rem",
          "--density-28": "2.25rem",
          "--density-30": "2.375rem",
          "--density-32": "2.5rem",
          "--density-36": "2.75rem",
          "--density-40": "3rem",
          "--density-48": "3.5rem",
          "--density-text-11": "12px",
          "--density-text-12": "13px",
          "--density-text-13": "15px",
          "--density-text-14": "16px",
          "--density-text-16": "18px",
          "--density-icon-14": "1rem",
          "--density-icon-16": "1.125rem"
        },
        "@utility density-compact": {
          "--density-4": "0.125rem",
          "--density-6": "0.25rem",
          "--density-8": "0.375rem",
          "--density-10": "0.5rem",
          "--density-12": "0.625rem",
          "--density-14": "0.75rem",
          "--density-16": "0.75rem",
          "--density-20": "1rem",
          "--density-24": "1.25rem",
          "--density-28": "1.5rem",
          "--density-30": "1.625rem",
          "--density-32": "1.75rem",
          "--density-36": "1.75rem",
          "--density-40": "2rem",
          "--density-48": "2.5rem",
          "--density-text-11": "11px",
          "--density-text-12": "12px",
          "--density-text-13": "12px",
          "--density-text-14": "13px",
          "--density-text-16": "15px",
          "--density-icon-14": "0.75rem",
          "--density-icon-16": "0.875rem"
        },
        "@utility density-default": {
          "--density-4": "0.25rem",
          "--density-6": "0.375rem",
          "--density-8": "0.5rem",
          "--density-10": "0.625rem",
          "--density-12": "0.75rem",
          "--density-14": "0.875rem",
          "--density-16": "1rem",
          "--density-20": "1.25rem",
          "--density-24": "1.5rem",
          "--density-28": "1.75rem",
          "--density-30": "1.875rem",
          "--density-32": "2rem",
          "--density-36": "2.25rem",
          "--density-40": "2.5rem",
          "--density-48": "3rem",
          "--density-text-11": "11px",
          "--density-text-12": "12px",
          "--density-text-13": "13px",
          "--density-text-14": "14px",
          "--density-text-16": "16px",
          "--density-icon-14": "0.875rem",
          "--density-icon-16": "1rem"
        },
        "@utility density-spacious": {
          "--density-4": "0.25rem",
          "--density-6": "0.5rem",
          "--density-8": "0.625rem",
          "--density-10": "0.75rem",
          "--density-12": "0.875rem",
          "--density-14": "1rem",
          "--density-16": "1.25rem",
          "--density-20": "1.5rem",
          "--density-24": "1.75rem",
          "--density-28": "2.25rem",
          "--density-30": "2.375rem",
          "--density-32": "2.5rem",
          "--density-36": "2.75rem",
          "--density-40": "3rem",
          "--density-48": "3.5rem",
          "--density-text-11": "12px",
          "--density-text-12": "13px",
          "--density-text-13": "15px",
          "--density-text-14": "16px",
          "--density-text-16": "18px",
          "--density-icon-14": "1rem",
          "--density-icon-16": "1.125rem"
        },
        "@utility scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            "display": "none"
          }
        },
        "@utility text-box-trim": {
          "text-box": "trim-both cap alphabetic"
        },
        "@utility weight-normal": {
          "font-variation-settings": "'wght' 400, 'opsz' 14"
        },
        "@utility weight-medium": {
          "font-variation-settings": "'wght' 450, 'opsz' 15"
        },
        "@utility weight-semibold": {
          "font-variation-settings": "'wght' 550, 'opsz' 18"
        },
        "@utility weight-bold": {
          "font-variation-settings": "'wght' 700, 'opsz' 25"
        }
      }
    },
    {
      "name": "density",
      "type": "registry:ui",
      "title": "Density",
      "description": "DensityProvider sets compact, default or spacious for everything inside it, including the popups and dialogs it opens.",
      "files": [
        {
          "path": "ui/density.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "layout"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/foundations/density"
        }
      }
    },
    {
      "name": "fluid-hover",
      "type": "registry:lib",
      "title": "Fluid Hover",
      "description": "One highlight that glides to the item nearest the pointer, and a selection background that slides between selected items.",
      "files": [
        {
          "path": "lib/fluid-hover.tsx",
          "type": "registry:lib"
        }
      ]
    },
    {
      "name": "sounds",
      "type": "registry:lib",
      "title": "Sounds",
      "description": "Interface sounds synthesized with the Web Audio API, and <SoundEffects /> to play them for every component. On by default.",
      "files": [
        {
          "path": "lib/sound-recipes.ts",
          "type": "registry:lib"
        },
        {
          "path": "lib/sounds.ts",
          "type": "registry:lib"
        },
        {
          "path": "components/sound-effects.tsx",
          "type": "registry:component"
        }
      ]
    },
    {
      "name": "desktop-window",
      "type": "registry:hook",
      "title": "Desktop Window",
      "description": "Finds the Electron or Tauri window hosting the page and gives the App Shell what to lay out around, so one layout serves a browser and a desktop app.",
      "files": [
        {
          "path": "hooks/use-desktop-window.ts",
          "type": "registry:hook"
        },
        {
          "path": "lib/desktop-window.ts",
          "type": "registry:lib"
        }
      ],
      "meta": {
        "fabricator": true
      }
    },
    {
      "name": "search",
      "type": "registry:ui",
      "title": "Search",
      "description": "A search button that springs open into a search field as one object. Escape clears, then closes.",
      "files": [
        {
          "path": "ui/search.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "forms"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/search",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/search#examples"
        }
      }
    },
    {
      "name": "file-upload",
      "type": "registry:ui",
      "title": "File Upload",
      "description": "A file picker with a drop zone: type, size and count checks with reasons, and the picked files as Attachment rows.",
      "registryDependencies": [
        "attachment",
        "button"
      ],
      "files": [
        {
          "path": "ui/file-upload.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "forms"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/file-upload",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/file-upload#examples"
        }
      }
    },
    {
      "name": "number-field",
      "type": "registry:ui",
      "title": "Number Field",
      "description": "A number input with decrement and increment steppers, min, max and step, keyboard stepping, and locale formatting for currency, percent and units.",
      "registryDependencies": [
        "input-group"
      ],
      "files": [
        {
          "path": "ui/number-field.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "forms"
      ],
      "meta": {
        "fabricator": true,
        "implementation": {
          "radix": "base"
        },
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/number-field",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/number-field#examples"
        }
      }
    },
    {
      "name": "date-input",
      "type": "registry:ui",
      "title": "Date Input",
      "description": "A text field that takes a typed date or one picked from a calendar, with a display format, a range and a form value.",
      "dependencies": [
        "date-fns",
        "@internationalized/date"
      ],
      "registryDependencies": [
        "calendar",
        "input-group",
        "popover"
      ],
      "files": [
        {
          "path": "ui/date-input.tsx",
          "type": "registry:ui"
        },
        {
          "path": "lib/date-input-model.ts",
          "type": "registry:lib"
        }
      ],
      "categories": [
        "forms"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/date-input",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/date-input#examples"
        }
      }
    },
    {
      "name": "month-input",
      "type": "registry:ui",
      "title": "Month Input",
      "description": "A text field that takes a typed month or one picked from a year of months, with a display format, a range and a form value.",
      "dependencies": [
        "date-fns"
      ],
      "registryDependencies": [
        "button",
        "input-group",
        "popover",
        "fluid-hover"
      ],
      "files": [
        {
          "path": "ui/month-input.tsx",
          "type": "registry:ui"
        },
        {
          "path": "lib/month-input-model.ts",
          "type": "registry:lib"
        }
      ],
      "categories": [
        "forms"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/month-input",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/month-input#examples"
        }
      }
    },
    {
      "name": "time-input",
      "type": "registry:ui",
      "title": "Time Input",
      "description": "A text field that takes a typed time or one picked from a list, in 12- or 24-hour form, with steps, a range and a form value.",
      "registryDependencies": [
        "input-group",
        "popover",
        "fluid-hover"
      ],
      "files": [
        {
          "path": "ui/time-input.tsx",
          "type": "registry:ui"
        },
        {
          "path": "lib/time-input-model.ts",
          "type": "registry:lib"
        }
      ],
      "categories": [
        "forms"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/time-input",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/time-input#examples"
        }
      }
    },
    {
      "name": "color-picker",
      "type": "registry:ui",
      "title": "Color Picker",
      "description": "A color picker with a saturation area, hue and alpha sliders, HEX, RGB, HSL and OKLCH fields, swatches and the eyedropper, inline or in a popover.",
      "registryDependencies": [
        "button",
        "button-group",
        "input-group",
        "popover",
        "select",
        "slider",
        "tooltip",
        "fluid-hover"
      ],
      "files": [
        {
          "path": "ui/color-picker.tsx",
          "type": "registry:ui"
        },
        {
          "path": "lib/color-model.ts",
          "type": "registry:lib"
        }
      ],
      "categories": [
        "forms"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/color-picker",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/color-picker#examples"
        }
      }
    },
    {
      "name": "app-shell-model",
      "type": "registry:lib",
      "title": "App Shell model",
      "description": "The App Shell's behaviour as plain data and pure functions: navigation, tabs, panels, layout, shortcuts, resize and breadcrumbs. No DOM, so a React Native shell can share it.",
      "files": [
        {
          "path": "lib/app-shell-model.ts",
          "type": "registry:lib"
        }
      ]
    },
    {
      "name": "sidebar-model",
      "type": "registry:lib",
      "title": "Sidebar model",
      "description": "The Sidebar's plain data and rules: its toggle's glyph, and how the phone sidebar's reveal moves and settles. No DOM, so a React Native shell can share it.",
      "files": [
        {
          "path": "lib/sidebar-model.ts",
          "type": "registry:lib"
        }
      ]
    },
    {
      "name": "sortable",
      "type": "registry:lib",
      "title": "Sortable",
      "description": "The one drag-and-drop adapter: pointer sorting in lists and between groups, used by Tab Strip and App Nav.",
      "dependencies": [
        "@dnd-kit/react@0.5.3",
        "@dnd-kit/dom@0.5.3",
        "@dnd-kit/abstract@0.5.3"
      ],
      "files": [
        {
          "path": "lib/sortable.tsx",
          "type": "registry:lib"
        }
      ]
    },
    {
      "name": "app-shell",
      "type": "registry:ui",
      "title": "App Shell",
      "description": "The frame an app lives in: sidebar, main column with header and breadcrumb, panels that dock or float by the room left, one shortcut registry, and native-window chrome for Electron and Tauri.",
      "registryDependencies": [
        "app-shell-model",
        "sidebar",
        "breadcrumb",
        "button",
        "drawer",
        "dropdown-menu",
        "kbd",
        "sheet",
        "tabs",
        "tooltip"
      ],
      "files": [
        {
          "path": "ui/app-shell.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "layout"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/app-shell",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/app-shell#examples"
        }
      }
    },
    {
      "name": "tab-strip",
      "type": "registry:ui",
      "title": "Tab Strip",
      "description": "Document tabs as in a browser or an editor: pinned and preview tabs, drag to reorder, close variants, reopen, rename and the usual shortcuts.",
      "registryDependencies": [
        "app-shell-model",
        "app-shell",
        "sortable",
        "fluid-hover",
        "button",
        "context-menu",
        "dropdown-menu",
        "spinner",
        "tooltip"
      ],
      "files": [
        {
          "path": "ui/tab-strip.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "navigation"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/tab-strip",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/tab-strip#examples"
        }
      }
    },
    {
      "name": "app-nav",
      "type": "registry:component",
      "title": "App Nav",
      "description": "Renders a navigation model into the Sidebar: groups, badges, statuses, children, row actions, reordering, pinning and hiding.",
      "registryDependencies": [
        "app-shell-model",
        "app-shell",
        "sortable",
        "sidebar",
        "button",
        "context-menu",
        "dialog",
        "dropdown-menu",
        "switch"
      ],
      "files": [
        {
          "path": "ui/app-nav.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "navigation"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/app-nav",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/app-nav#examples"
        }
      }
    },
    {
      "name": "workspace-switcher",
      "type": "registry:component",
      "title": "Workspace Switcher",
      "description": "Switches the organization or workspace: a menu for a few, a searchable dialog for many, and an overlay while the next one loads.",
      "registryDependencies": [
        "app-shell",
        "sidebar",
        "command",
        "dropdown-menu",
        "spinner",
        "tooltip"
      ],
      "files": [
        {
          "path": "ui/workspace-switcher.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "navigation"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/workspace-switcher",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/workspace-switcher#examples"
        }
      }
    },
    {
      "name": "user-menu",
      "type": "registry:component",
      "title": "User Menu",
      "description": "The signed-in person's menu, as a sidebar row or an avatar mark.",
      "registryDependencies": [
        "sidebar",
        "avatar",
        "dropdown-menu"
      ],
      "files": [
        {
          "path": "ui/user-menu.tsx",
          "type": "registry:ui"
        }
      ],
      "categories": [
        "navigation"
      ],
      "meta": {
        "fabricator": true,
        "links": {
          "docs": "https://fabricator-ui.vercel.app/docs/components/base/user-menu",
          "examples": "https://fabricator-ui.vercel.app/docs/components/base/user-menu#examples"
        }
      }
    },
    {
      "name": "app-shell-01",
      "title": "App Shell 01",
      "description": "A workspace app: account and organization in the sidebar's first row, customizable grouped navigation, a breadcrumb that hands over to the page title, and a details panel.",
      "registryDependencies": [
        "app-shell",
        "app-nav",
        "workspace-switcher",
        "user-menu"
      ],
      "type": "registry:block",
      "files": [
        {
          "path": "blocks/app-shell-01/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        }
      ],
      "categories": [
        "app-shell",
        "dashboard"
      ],
      "meta": {
        "fabricator": true
      }
    },
    {
      "name": "app-shell-02",
      "title": "App Shell 02",
      "description": "A workbench: document tabs above the content, a resources panel switched from the tab row, a status bar, and a sidebar that peeks.",
      "registryDependencies": [
        "app-shell",
        "app-nav",
        "tab-strip"
      ],
      "type": "registry:block",
      "files": [
        {
          "path": "blocks/app-shell-02/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        }
      ],
      "categories": [
        "app-shell",
        "dashboard"
      ],
      "meta": {
        "fabricator": true
      }
    },
    {
      "name": "app-shell-03",
      "title": "App Shell 03",
      "description": "A classic SaaS layout: team switcher on top, the person's menu at the bottom, and a sidebar that collapses to icons.",
      "registryDependencies": [
        "app-shell",
        "app-nav",
        "workspace-switcher",
        "user-menu"
      ],
      "type": "registry:block",
      "files": [
        {
          "path": "blocks/app-shell-03/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        }
      ],
      "categories": [
        "app-shell",
        "dashboard"
      ],
      "meta": {
        "fabricator": true
      }
    },
    {
      "name": "app-shell-04",
      "title": "App Shell 04",
      "description": "A desktop app for Electron or Tauri: tabs in a titlebar row that clears the native window controls, with drag regions.",
      "registryDependencies": [
        "app-shell",
        "app-nav",
        "tab-strip"
      ],
      "type": "registry:block",
      "files": [
        {
          "path": "blocks/app-shell-04/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        }
      ],
      "categories": [
        "app-shell",
        "dashboard"
      ],
      "meta": {
        "fabricator": true
      }
    },
    {
      "name": "app-shell-05",
      "title": "App Shell 05",
      "description": "Mobile first: a tab bar and a floating primary action on phones, and a message that swaps in over the list.",
      "registryDependencies": [
        "app-shell",
        "app-nav"
      ],
      "type": "registry:block",
      "files": [
        {
          "path": "blocks/app-shell-05/page.tsx",
          "type": "registry:page",
          "target": "app/dashboard/page.tsx"
        }
      ],
      "categories": [
        "app-shell",
        "dashboard"
      ],
      "meta": {
        "fabricator": true
      }
    },
    {
      "name": "radius-pill",
      "type": "registry:theme",
      "title": "Pill radius",
      "description": "Sets --radius to 1.25rem: controls become full pills and containers stay concentric. The default is 0.5rem.",
      "cssVars": {
        "light": {
          "radius": "1.25rem"
        }
      }
    }
  ]
}
