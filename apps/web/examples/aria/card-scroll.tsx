import { Button } from "@/styles/aria-nova/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/styles/aria-nova/ui/card"

// Long text in a card scrolls in a region that reaches the card's sides while
// its lines stay on the inset. It fades out at the top and bottom as it
// scrolls instead of being cut at a line, and keeps the card's gap above the
// footer so the buttons never touch it.
export function CardScroll() {
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>Terms of Service</CardTitle>
        <CardDescription>
          Review the terms before accepting the agreement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="region"
          aria-label="Terms of Service"
          tabIndex={0}
          className="-mx-(--card-spacing) flex max-h-48 scroll-fade-y flex-col gap-(--density-12) overflow-y-auto px-(--card-spacing) leading-relaxed outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <p>
            These terms govern your use of the workspace, including access to
            shared documents, project files, and collaboration tools.
          </p>
          <p>
            You are responsible for the content you upload and for ensuring that
            your team has the appropriate permissions to view or edit it.
          </p>
          <p>
            We may update features or limits as the service evolves. When those
            changes materially affect your workflow, we will notify your
            workspace administrators.
          </p>
          <p>
            By continuing, you agree to keep your account credentials secure and
            to follow your organization&apos;s acceptable use policies.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="outline">Decline</Button>
        <Button>Accept</Button>
      </CardFooter>
    </Card>
  )
}
