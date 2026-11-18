import { FinanceCardLink } from "@/registry/bases/__base__/blocks/finance-01/components/finance-card-link"
import {
  type FinanceAccount,
  type FinanceCard,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-data"
import {
  formatMoney,
  formatMoneyCompact,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { Progress } from "@/registry/bases/__base__/ui/progress"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const ACCOUNT_ICONS: Record<FinanceAccount["kind"], React.ReactNode> = {
  checking: (
    <IconPlaceholder
      lucide="LandmarkIcon"
      tabler="IconBuildingBank"
      hugeicons="BankIcon"
      phosphor="BankIcon"
      remixicon="RiBankLine"
    />
  ),
  treasury: (
    <IconPlaceholder
      lucide="TrendingUpIcon"
      tabler="IconTrendingUp"
      hugeicons="ChartIncreaseIcon"
      phosphor="TrendUpIcon"
      remixicon="RiStockLine"
    />
  ),
  savings: (
    <IconPlaceholder
      lucide="PiggyBankIcon"
      tabler="IconPig"
      hugeicons="PiggyBankIcon"
      phosphor="PiggyBankIcon"
      remixicon="RiSafe2Line"
    />
  ),
}

/** Where the cash sits, and how much of the card's limit is used. */
export function FinanceAccountsCard({
  accounts,
  card,
  className,
}: {
  accounts: FinanceAccount[]
  card: FinanceCard
  className?: string
}) {
  const used = Math.round((card.spent / card.limit) * 100)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>Balances today</CardDescription>
        <CardAction>
          <FinanceCardLink href="/accounts">View all</FinanceCardLink>
        </CardAction>
      </CardHeader>
      <CardContent className="px-[calc(var(--card-spacing)-var(--density-12))]">
        <ItemGroup>
          {accounts.map((account) => (
            <Item key={account.id} role="listitem" size="sm">
              <ItemMedia variant="icon" className="text-muted-foreground">
                {ACCOUNT_ICONS[account.kind]}
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle>{account.name}</ItemTitle>
                <ItemDescription className="truncate">
                  {account.detail}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="font-medium text-foreground tabular-nums">
                {formatMoney(account.balance)}
              </ItemActions>
            </Item>
          ))}
          {/* The card is a limit, not a balance: a muted well sets it apart. */}
          <Item role="listitem" size="sm" variant="muted">
            <ItemMedia variant="icon" className="text-muted-foreground">
              <IconPlaceholder
                lucide="CreditCardIcon"
                tabler="IconCreditCard"
                hugeicons="CreditCardIcon"
                phosphor="CreditCardIcon"
                remixicon="RiBankCardLine"
              />
            </ItemMedia>
            <ItemContent className="min-w-0 gap-(--density-8)">
              <div className="flex flex-col">
                <ItemTitle className="w-full">
                  <span className="truncate">{card.name}</span>
                  <span className="ms-auto font-medium tabular-nums">
                    {formatMoney(card.spent)}
                  </span>
                </ItemTitle>
                <ItemDescription className="flex w-full gap-(--density-8)">
                  <span className="truncate">{card.detail}</span>
                  <span className="ms-auto shrink-0 tabular-nums">
                    {used}% of {formatMoneyCompact(card.limit)}
                  </span>
                </ItemDescription>
              </div>
              <Progress value={used} aria-label={`${card.name} limit used`} />
            </ItemContent>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
