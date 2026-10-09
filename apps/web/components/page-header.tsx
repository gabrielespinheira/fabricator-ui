import { cn } from "cn"

function PageHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={cn("border-grid", className)} {...props}>
      <div className="container-wrapper">
        <div className="container flex flex-col items-center gap-4 px-6 pt-16 pb-14 text-center md:pt-24 md:pb-20">
          {children}
        </div>
      </div>
    </section>
  )
}

function PageHeaderHeading({
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "max-w-3xl text-[32px] leading-[1.06] font-medium tracking-[-0.022em] text-balance text-foreground md:text-[40px]",
        className
      )}
      {...props}
    />
  )
}

function PageHeaderDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "max-w-[30rem] text-[15px] leading-normal text-balance text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function PageActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-2 pt-3 **:data-[slot=button]:h-10 **:data-[slot=button]:rounded-full **:data-[slot=button]:px-5 **:data-[slot=button]:text-[15px] **:data-[slot=button]:shadow-none",
        className
      )}
      {...props}
    />
  )
}

export { PageActions, PageHeader, PageHeaderDescription, PageHeaderHeading }
