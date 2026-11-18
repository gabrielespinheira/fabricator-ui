import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import { type ChartConfig } from "@/styles/base-fabricator/ui/chart-kit"
import { CompositionChart } from "@/styles/base-fabricator/ui/composition-chart"

// Visits by source over thirty days. Search takes a growing share as social
// fades; the newsletter's day shows as a weekly band of email.
const data = [
  {
    date: "Nov 1",
    search: 3_800,
    direct: 2_630,
    referral: 1_280,
    social: 2_560,
    email: 550,
  },
  {
    date: "Nov 2",
    search: 4_010,
    direct: 2_680,
    referral: 1_260,
    social: 2_480,
    email: 1_670,
  },
  {
    date: "Nov 3",
    search: 4_100,
    direct: 2_620,
    referral: 1_340,
    social: 2_380,
    email: 520,
  },
  {
    date: "Nov 4",
    search: 4_220,
    direct: 2_600,
    referral: 1_350,
    social: 2_230,
    email: 600,
  },
  {
    date: "Nov 5",
    search: 4_270,
    direct: 2_650,
    referral: 1_350,
    social: 2_080,
    email: 520,
  },
  {
    date: "Nov 6",
    search: 4_330,
    direct: 2_550,
    referral: 1_410,
    social: 1_960,
    email: 590,
  },
  {
    date: "Nov 7",
    search: 4_400,
    direct: 2_510,
    referral: 1_410,
    social: 2_000,
    email: 560,
  },
  {
    date: "Nov 8",
    search: 4_470,
    direct: 2_480,
    referral: 1_350,
    social: 1_870,
    email: 540,
  },
  {
    date: "Nov 9",
    search: 4_340,
    direct: 2_310,
    referral: 1_340,
    social: 1_950,
    email: 1_640,
  },
  {
    date: "Nov 10",
    search: 4_300,
    direct: 2_330,
    referral: 1_400,
    social: 1_990,
    email: 570,
  },
  {
    date: "Nov 11",
    search: 4_240,
    direct: 2_280,
    referral: 1_310,
    social: 1_970,
    email: 590,
  },
  {
    date: "Nov 12",
    search: 4_200,
    direct: 2_230,
    referral: 1_340,
    social: 2_030,
    email: 500,
  },
  {
    date: "Nov 13",
    search: 4_240,
    direct: 2_320,
    referral: 1_320,
    social: 2_090,
    email: 570,
  },
  {
    date: "Nov 14",
    search: 4_290,
    direct: 2_200,
    referral: 1_310,
    social: 2_030,
    email: 590,
  },
  {
    date: "Nov 15",
    search: 4_320,
    direct: 2_320,
    referral: 1_330,
    social: 1_990,
    email: 600,
  },
  {
    date: "Nov 16",
    search: 4_290,
    direct: 2_340,
    referral: 1_290,
    social: 1_820,
    email: 1_630,
  },
  {
    date: "Nov 17",
    search: 4_410,
    direct: 2_340,
    referral: 1_380,
    social: 1_750,
    email: 560,
  },
  {
    date: "Nov 18",
    search: 4_530,
    direct: 2_370,
    referral: 1_400,
    social: 1_600,
    email: 560,
  },
  {
    date: "Nov 19",
    search: 4_550,
    direct: 2_390,
    referral: 1_390,
    social: 1_420,
    email: 590,
  },
  {
    date: "Nov 20",
    search: 4_780,
    direct: 2_500,
    referral: 1_430,
    social: 1_430,
    email: 560,
  },
  {
    date: "Nov 21",
    search: 4_880,
    direct: 2_610,
    referral: 1_500,
    social: 1_470,
    email: 560,
  },
  {
    date: "Nov 22",
    search: 5_010,
    direct: 2_610,
    referral: 1_580,
    social: 1_390,
    email: 600,
  },
  {
    date: "Nov 23",
    search: 5_050,
    direct: 2_640,
    referral: 1_550,
    social: 1_470,
    email: 1_620,
  },
  {
    date: "Nov 24",
    search: 5_180,
    direct: 2_720,
    referral: 1_620,
    social: 1_550,
    email: 600,
  },
  {
    date: "Nov 25",
    search: 5_190,
    direct: 2_720,
    referral: 1_650,
    social: 1_550,
    email: 520,
  },
  {
    date: "Nov 26",
    search: 5_200,
    direct: 2_740,
    referral: 1_650,
    social: 1_500,
    email: 560,
  },
  {
    date: "Nov 27",
    search: 5_170,
    direct: 2_690,
    referral: 1_590,
    social: 1_450,
    email: 540,
  },
  {
    date: "Nov 28",
    search: 5_140,
    direct: 2_620,
    referral: 1_560,
    social: 1_350,
    email: 500,
  },
  {
    date: "Nov 29",
    search: 5_020,
    direct: 2_700,
    referral: 1_620,
    social: 1_210,
    email: 520,
  },
  {
    date: "Nov 30",
    search: 5_040,
    direct: 2_600,
    referral: 1_590,
    social: 1_120,
    email: 1_640,
  },
]

const config = {
  search: { label: "Search" },
  direct: { label: "Direct" },
  referral: { label: "Referral" },
  social: { label: "Social" },
  email: { label: "Email" },
} satisfies ChartConfig

export function CompositionChartDemo() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Traffic by source</CardTitle>
        <CardDescription>
          Acme Inc, share of visits over 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CompositionChart
          data={data}
          index="date"
          config={config}
          label="Share of visits by source"
        />
      </CardContent>
    </Card>
  )
}
