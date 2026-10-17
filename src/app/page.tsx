import { connection } from "next/server"

import { Desk } from "@/components/desk"
import { formatLongDate, isNewYorkWeekend } from "@/lib/format"

export default async function Home() {
  await connection()
  const now = new Date()
  return (
    <Desk dateLabel={formatLongDate(now)} weekend={isNewYorkWeekend(now)} />
  )
}
