import { FinanceCardLink } from "@/registry/bases/__base__/blocks/finance-01/components/finance-card-link"
import {
  formatMoney,
  formatMoneyCompact,
  getAccountShares,
  type FinanceAccount,
  type FinanceAccountId,
  type FinanceCard,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { Progress } from "@/registry/bases/__base__/ui/progress"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const ACCOUNT_ICONS: Record<FinanceAccountId, React.ReactNode> = {
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
  card: (
    <IconPlaceholder
      lucide="CreditCardIcon"
      tabler="IconCreditCard"
      hugeicons="CreditCardIcon"
      phosphor="CreditCardIcon"
      remixicon="RiBankCardLine"
    />
  ),
}

/** One account or card: what it is, its amount, and what the amount is of. */
function FinanceAccountRow({
  id,
  name,
  detail,
  amount,
  scope,
}: {
  id: FinanceAccountId
  name: string
  detail: string
  amount: number
  scope: string
}) {
  return (
    <Item role="listitem" size="sm">
      <ItemMedia variant="icon" className="text-muted-foreground">
        {ACCOUNT_ICONS[id]}
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{name}</ItemTitle>
        <ItemDescription>{detail}</ItemDescription>
      </ItemContent>
      <ItemContent className="items-end tabular-nums">
        <ItemTitle>{formatMoney(amount)}</ItemTitle>
        <ItemDescription>{scope}</ItemDescription>
      </ItemContent>
    </Item>
  )
}

/** Where the cash sits, then how much of the card's limit is used. */
export function FinanceAccountsCard({
  accounts,
  card,
  cardSpent,
  className,
}: {
  accounts: readonly FinanceAccount[]
  card: FinanceCard
  cardSpent: number
  className?: string
}) {
  const shares = getAccountShares(accounts)
  const used = Math.round((cardSpent / card.limit) * 100)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>Share of cash</CardDescription>
        <CardAction>
          <FinanceCardLink href="/accounts">View all</FinanceCardLink>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 px-[calc(var(--card-spacing)-var(--density-12))]">
        <ItemGroup>
          {accounts.map((account) => (
            <FinanceAccountRow
              key={account.id}
              id={account.id}
              name={account.name}
              detail={account.detail}
              amount={account.balance}
              scope={`${shares[account.id]}%`}
            />
          ))}
        </ItemGroup>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-(--density-8)">
        <div className="flex flex-wrap items-baseline justify-between gap-x-(--density-8)">
          <span className="font-medium">{card.name} utilization</span>
          <span className="text-muted-foreground tabular-nums">
            {formatMoney(cardSpent)} of {formatMoneyCompact(card.limit)}
          </span>
        </div>
        <Progress value={used} aria-label={`${card.name} limit used`} />
      </CardFooter>
    </Card>
  )
}
