import { Bell, CalendarCheck, Download, Plus, Trash2, Users, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Logo, LogoMark } from '@/components/brand/Logo'
import { HeroPattern, RibbonPattern, StateIllustration } from '@/components/brand/Patterns'
import { CycleBadge } from '@/components/CycleBadge'
import { KpiCard } from '@/components/KpiCard'
import { MoneyAmount } from '@/components/MoneyAmount'
import { Reveal } from '@/components/motion/Reveal'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { formatMoney } from '@/lib/format'
import { useDocumentTheme } from '@/lib/hooks/useDocumentTheme'
import { toast } from '@/lib/toast'

/** Échantillons de couleurs : nom du token CSS et classe de fond (valeurs réelles lues par le navigateur). */
const SWATCHES = [
  { token: '--primary', className: 'bg-primary' },
  { token: '--accent', className: 'bg-accent' },
  { token: '--success', className: 'bg-success' },
  { token: '--destructive', className: 'bg-destructive' },
  { token: '--background', className: 'bg-background' },
  { token: '--card', className: 'bg-card' },
  { token: '--muted', className: 'bg-muted' },
  { token: '--border', className: 'bg-border' },
  { token: '--warm-600', className: 'bg-warm-600' },
  { token: '--sidebar', className: 'bg-sidebar' },
] as const

const CYCLES = [
  { code: 'daycare', base: 'bg-cycle-daycare', soft: 'bg-cycle-daycare-soft', hex: '#F97362' },
  {
    code: 'kindergarten',
    base: 'bg-cycle-kindergarten',
    soft: 'bg-cycle-kindergarten-soft',
    hex: '#F5B700',
  },
  { code: 'primary', base: 'bg-cycle-primary', soft: 'bg-cycle-primary-soft', hex: '#3B82F6' },
] as const

const BUTTON_VARIANTS = [
  'default',
  'accent',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
] as const

/** Lignes d'exemple du tableau (données fictives). */
const SAMPLE_ROWS = [
  { name: 'Kouamé Aya', classroom: 'CE1 A', cycle: 'primary', balance: 45_000 },
  { name: 'Traoré Ibrahim', classroom: 'MS B', cycle: 'kindergarten', balance: 0 },
  { name: 'Bamba Grâce', classroom: 'Crèche', cycle: 'daycare', balance: 120_000 },
] as const

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <h2 id={id} className="font-display text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Page de référence du design system (local et staging uniquement, voir routes/design.tsx). */
export function DesignPage() {
  const { t } = useTranslation()
  useDocumentTheme()

  return (
    <main id="contenu" className="mx-auto grid max-w-6xl gap-12 px-4 py-8 sm:px-8 lg:py-12">
      <PageHeader
        eyebrow={<Logo />}
        title={t('design.title')}
        description={t('design.description')}
        actions={<ThemeToggle />}
      />

      <Section id="colors" title={t('design.sections.colors')}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map((swatch) => (
            <li
              key={swatch.token}
              className="overflow-hidden rounded-2xl border bg-card shadow-soft"
            >
              <div className={`h-16 border-b ${swatch.className}`} />
              <p className="px-3 py-2 font-mono text-xs">{swatch.token}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="cycles" title={t('design.sections.cycles')}>
        <div className="grid gap-3 sm:grid-cols-3">
          {CYCLES.map((cycle) => (
            <div key={cycle.code} className={`grid gap-3 rounded-2xl p-4 ${cycle.soft}`}>
              <div className="flex items-center justify-between">
                <CycleBadge code={cycle.code} label={t(`cycles.${cycle.code}`)} />
                <span className={`size-8 rounded-full ${cycle.base}`} aria-hidden />
              </div>
              <p className="font-mono text-xs">{cycle.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="typography" title={t('design.sections.typography')}>
        <Card>
          <CardContent className="grid gap-4 pt-6">
            <p className="font-display text-4xl font-bold tracking-tight">
              {t('design.sample.display')}
            </p>
            <p className="font-display text-5xl font-bold text-accent-ink tabular">
              <MoneyAmount value={1_250_000} />
            </p>
            <p className="max-w-2xl text-base leading-relaxed">{t('design.sample.body')}</p>
            <p className="text-sm text-muted-foreground">{t('design.sample.body')}</p>
          </CardContent>
        </Card>
      </Section>

      <Section id="buttons" title={t('design.sections.buttons')}>
        <div className="flex flex-wrap items-center gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {t(`design.variants.${variant}`)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">
            <Plus aria-hidden />
            {t('design.sample.emptyAction')}
          </Button>
          <Button size="lg" variant="accent">
            <Wallet aria-hidden />
            {t('design.sample.dialogTitle')}
          </Button>
          <Button size="icon" variant="outline" aria-label={t('common.notifications')}>
            <Bell aria-hidden />
          </Button>
          <Button disabled>{t('common.loading')}</Button>
        </div>
      </Section>

      <Section id="forms" title={t('design.sections.forms')}>
        <Card>
          <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
            <Field label={t('design.sample.name')} hint={t('design.sample.nameHint')}>
              {(control) => <Input {...control} placeholder={t('design.sample.namePlaceholder')} />}
            </Field>
            <Field label={t('design.sample.name')} error={t('design.sample.nameError')}>
              {(control) => <Input {...control} />}
            </Field>
            <Field label={t('auth.login.password')}>
              {(control) => <PasswordInput {...control} />}
            </Field>
            <Field label={t('design.sample.comment')}>
              {(control) => <Textarea {...control} rows={3} />}
            </Field>
            <div className="flex items-center gap-3">
              <Switch id="design-notify" defaultChecked />
              <Label htmlFor="design-notify">{t('design.sample.notify')}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="design-consent" />
              <Label htmlFor="design-consent">{t('design.sample.consent')}</Label>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section id="badges" title={t('design.sections.badges')}>
        <div className="flex flex-wrap gap-2">
          <Badge>{t('roles.director')}</Badge>
          <Badge variant="secondary">{t('roles.secretary')}</Badge>
          <Badge variant="outline">{t('roles.teacher')}</Badge>
          <Badge variant="success">{t('auth.password.success')}</Badge>
          <Badge variant="destructive">{t('nav.unpaid')}</Badge>
          <Badge variant="accent">{t('preRegistrations.status.pending')}</Badge>
          <CycleBadge code="daycare" label={t('cycles.daycare')} />
          <CycleBadge code="kindergarten" label={t('cycles.kindergarten')} />
          <CycleBadge code="primary" label={t('cycles.primary')} />
        </div>
        <div className="flex items-center gap-3">
          <Avatar name="Kouamé Aya" size="sm" />
          <Avatar name="Traoré Ibrahim" />
          <Avatar name="Bamba Grâce" size="lg" />
        </div>
      </Section>

      <Section id="cards" title={t('design.sections.cards')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal index={0}>
            <KpiCard
              label={t('design.sample.kpiStudents')}
              value={486}
              format={(value) => value.toLocaleString('fr-FR')}
              icon={Users}
              hint={t('design.sample.kpiHint')}
            />
          </Reveal>
          <Reveal index={1}>
            <KpiCard
              label={t('design.sample.kpiCollected')}
              value={8_450_000}
              format={formatMoney}
              icon={Wallet}
              tone="accent"
            />
          </Reveal>
          <Reveal index={2}>
            <KpiCard
              label={t('design.sample.kpiAbsences')}
              value={7}
              format={String}
              icon={CalendarCheck}
              tone="danger"
            />
          </Reveal>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('design.sample.progress')}</CardTitle>
            <CardDescription>{t('design.sample.kpiHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={72} aria-label={t('design.sample.progress')} />
          </CardContent>
        </Card>
      </Section>

      <Section id="feedback" title={t('design.sections.feedback')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState
            title={t('design.sample.emptyTitle')}
            description={t('design.sample.emptyDescription')}
            action={
              <Button>
                <Plus aria-hidden />
                {t('design.sample.emptyAction')}
              </Button>
            }
          />
          <ErrorState onRetry={() => undefined} />
        </div>
      </Section>

      <Section id="overlays" title={t('design.sections.overlays')}>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">{t('design.sample.openDialog')}</Button>
            </DialogTrigger>
            <DialogContent closeLabel={t('common.close')}>
              <DialogTitle>{t('design.sample.dialogTitle')}</DialogTitle>
              <DialogDescription>{t('design.sample.dialogDescription')}</DialogDescription>
              <DialogFooter>
                <Button variant="ghost">{t('common.cancel')}</Button>
                <Button variant="accent">{t('common.continue')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">{t('design.sample.openSheet')}</Button>
            </SheetTrigger>
            <SheetContent side="right" closeLabel={t('common.close')} className="p-6">
              <SheetTitle>{t('design.sample.sheetTitle')}</SheetTitle>
              <SheetDescription>{t('design.sample.emptyDescription')}</SheetDescription>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">{t('design.sample.openMenu')}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Users aria-hidden />
                {t('design.sample.menuItem1')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download aria-hidden />
                {t('design.sample.menuItem2')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive-ink">
                <Trash2 aria-hidden />
                {t('design.sample.danger')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">{t('design.sample.tooltip')}</Button>
            </TooltipTrigger>
            <TooltipContent>{t('design.sample.tooltipText')}</TooltipContent>
          </Tooltip>
          <Button
            variant="secondary"
            onClick={() => {
              toast(t('design.sample.toastTitle'), {
                description: t('design.sample.toastDescription'),
                tone: 'success',
              })
            }}
          >
            {t('design.sample.toast')}
          </Button>
        </div>
        <Tabs defaultValue="identity" className="max-w-xl">
          <TabsList>
            <TabsTrigger value="identity">{t('design.sample.tab1')}</TabsTrigger>
            <TabsTrigger value="guardians">{t('design.sample.tab2')}</TabsTrigger>
            <TabsTrigger value="payments">{t('design.sample.tab3')}</TabsTrigger>
          </TabsList>
          <TabsContent value="identity">{t('design.sample.tabContent1')}</TabsContent>
          <TabsContent value="guardians">{t('design.sample.tabContent2')}</TabsContent>
          <TabsContent value="payments">{t('design.sample.tabContent3')}</TabsContent>
        </Tabs>
      </Section>

      <Section id="table" title={t('design.sections.table')}>
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('design.sample.tableStudent')}</TableHead>
                <TableHead>{t('design.sample.tableClass')}</TableHead>
                <TableHead className="text-right">{t('design.sample.tableBalance')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_ROWS.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Avatar name={row.name} size="sm" />
                      {row.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <CycleBadge code={row.cycle} label={row.classroom} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyAmount value={row.balance} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Section>

      <Section id="brand" title={t('design.sections.brand')}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="relative h-64 overflow-hidden rounded-3xl bg-navy p-6">
            <HeroPattern className="absolute inset-0 size-full" />
            <Logo inverted className="relative" />
          </div>
          <div className="grid gap-4">
            <div className="relative h-24 overflow-hidden rounded-3xl bg-navy">
              <RibbonPattern className="absolute inset-0 size-full" />
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-4">
              <LogoMark className="size-14" />
              {(['empty', 'search', 'error', 'offline', 'lost', 'soon'] as const).map((name) => (
                <StateIllustration key={name} name={name} className="h-16" />
              ))}
            </div>
          </div>
        </div>
      </Section>
    </main>
  )
}
