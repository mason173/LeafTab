import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RiChromeFill, RiEdgeFill, RiFirefoxFill, RiGithubFill } from '@/icons/ri-compat';
import { buildChangelogItems } from '@/components/changelog/changelog-data';
import { ChangelogTimeline } from '@/components/changelog/ChangelogTimeline';
import { BackToSettingsButton } from '@/components/BackToSettingsButton';
import aboutIcon from '@/assets/abouticon.svg';

export type AboutLeafTabModalTab = 'about' | 'changelog';

type AboutLeafTabDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: AboutLeafTabModalTab;
  onBackToSettings?: () => void;
};

type LinkChip = {
  name: string;
  url: string;
};

function AboutLinkChip({ item }: { item: LinkChip }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-[34px] items-center rounded-full border border-border/70 bg-secondary/16 px-4 text-[10.5px] font-medium text-foreground transition-colors hover:bg-secondary/28"
    >
      {item.name}
    </a>
  );
}

function AboutMarqueeRow({
  items,
  reverse = false,
  durationSeconds = 28,
}: {
  items: LinkChip[];
  reverse?: boolean;
  durationSeconds?: number;
}) {
  if (items.length === 0) return null;

  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]">
      <div
        className="flex w-max gap-3 whitespace-nowrap group-hover:[animation-play-state:paused]"
        style={{
          animation: `${reverse ? 'leaftab-marquee-scroll-reverse' : 'leaftab-marquee-scroll'} ${durationSeconds}s linear infinite`,
        }}
      >
        {[...items, ...items].map((item, index) => (
          <AboutLinkChip key={`${item.url}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function StoreLinkCard({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center justify-center gap-2 rounded-[18px] border border-border/70 bg-secondary/16 px-3.5 py-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-secondary/28"
    >
      <span className="shrink-0 text-foreground">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  );
}

export function AboutLeafTabDialog({
  open,
  onOpenChange,
  defaultTab = 'about',
  onBackToSettings,
}: AboutLeafTabDialogProps) {
  const { t, i18n } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>('—');
  const [activeTab, setActiveTab] = useState<AboutLeafTabModalTab>(defaultTab);

  const acknowledgements = useMemo(() => ([
    { name: 'React', url: 'https://react.dev/' },
    { name: 'Vite', url: 'https://vite.dev/' },
    { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
    { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
    { name: 'Radix UI', url: 'https://www.radix-ui.com/' },
    { name: 'shadcn/ui', url: 'https://ui.shadcn.com/' },
    { name: 'Framer Motion', url: 'https://www.framer.com/motion/' },
    { name: 'i18next', url: 'https://www.i18next.com/' },
    { name: 'next-themes', url: 'https://github.com/pacocoursey/next-themes' },
    { name: 'Lucide', url: 'https://lucide.dev/' },
    { name: 'lunar-javascript', url: 'https://github.com/6tail/lunar-javascript' },
    { name: 'Recharts', url: 'https://recharts.org/' },
    { name: 'Node.js', url: 'https://nodejs.org/' },
    { name: 'Express', url: 'https://expressjs.com/' },
    { name: 'SQLite', url: 'https://www.sqlite.org/' },
    { name: 'sqlite3', url: 'https://github.com/TryGhost/node-sqlite3' },
    { name: 'jsonwebtoken', url: 'https://github.com/auth0/node-jsonwebtoken' },
    { name: 'bcryptjs', url: 'https://github.com/dcodeIO/bcrypt.js' },
    { name: 'helmet', url: 'https://helmetjs.github.io/' },
    { name: 'cors', url: 'https://github.com/expressjs/cors' },
    { name: 'express-session', url: 'https://github.com/expressjs/session' },
    { name: 'express-rate-limit', url: 'https://github.com/express-rate-limit/express-rate-limit' },
    { name: 'svg-captcha', url: 'https://github.com/produck/svg-captcha' },
    { name: 'connect-sqlite3', url: 'https://github.com/rawberg/connect-sqlite3' },
    { name: 'shadcn/ui License', url: 'https://github.com/shadcn-ui/ui/blob/main/LICENSE.md' },
  ]), []);

  const changelogItems = useMemo(() => buildChangelogItems(t), [t]);
  const acknowledgementRows = useMemo(() => {
    const firstRow: LinkChip[] = [];
    const secondRow: LinkChip[] = [];

    acknowledgements.forEach((item, index) => {
      if (index % 2 === 0) {
        firstRow.push(item);
      } else {
        secondRow.push(item);
      }
    });

    return [firstRow, secondRow] as const;
  }, [acknowledgements]);

  useEffect(() => {
    if (!open) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
        const manifest = chrome.runtime.getManifest();
        setAppVersion(manifest.version_name || manifest.version || '—');
        return;
      }
    } catch {}

    try {
      fetch('/manifest.json')
        .then((resp) => resp.json())
        .then((manifest) => setAppVersion(manifest?.version_name || manifest?.version || '—'))
        .catch(() => setAppVersion('—'));
    } catch {
      setAppVersion('—');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(defaultTab);
  }, [defaultTab, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="about-leaftab-dialog"
        className="flex h-[min(72vh,620px)] w-[min(920px,calc(100vw-1rem))] max-w-[920px] min-w-0 flex-col gap-0 overflow-hidden rounded-[34px] border-border bg-background p-0 text-foreground sm:max-w-[920px]"
      >
        <DialogHeader className="px-5 pb-1 pt-4 text-left">
          <div className="flex min-w-0 items-center gap-3 pr-10">
            {onBackToSettings ? <BackToSettingsButton onClick={onBackToSettings} /> : null}
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
                {t('settings.about.title')}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 pb-1.5">
          <div className="frosted-control-surface grid h-10 flex-1 grid-cols-2 rounded-[18px] p-1 text-muted-foreground">
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`inline-flex items-center justify-center rounded-[14px] px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === 'about'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-[var(--frosted-ui-control-fill-hover)] hover:text-foreground'
              }`}
            >
              {t('settings.about.title', { defaultValue: 'About' })}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('changelog')}
              className={`inline-flex items-center justify-center rounded-[14px] px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === 'changelog'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-[var(--frosted-ui-control-fill-hover)] hover:text-foreground'
              }`}
            >
              {t('changelog.title', { defaultValue: 'Changelog' })}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'about' ? (
            <div className="h-full px-5 pb-2.5 pt-1.5">
              <div className="mx-auto flex h-full max-w-[860px] flex-col gap-3">
                <div className="grid min-h-0 gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-start">
                  <div className="flex min-w-0 flex-col items-center gap-2 text-center md:pt-1">
                    <img
                      src={aboutIcon}
                      alt="LeafTab"
                      className="h-16 w-16 rounded-[18px] border border-border/60 bg-secondary/14 p-2 object-contain"
                    />
                    <div className="space-y-1">
                      <div className="text-[25px] font-semibold tracking-[-0.04em] text-foreground">LeafTab</div>
                      <div className="text-[12px] text-foreground/76">
                        {t('settings.about.versionLabel', { defaultValue: '版本 v{{version}}', version: appVersion })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t('settings.about.qqGroup', { defaultValue: '交流QQ群：1075260794' })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.08fr)_minmax(240px,0.92fr)]">
                    <div className="space-y-2.5">
                      <p className="text-[11.5px] leading-5 whitespace-pre-wrap break-words text-muted-foreground [overflow-wrap:anywhere]">
                        {t('settings.about.content')}
                      </p>

                      <div className="rounded-[20px] border border-border/70 bg-secondary/14 px-4 py-3">
                        <div className="space-y-1 text-[11.5px] leading-5 text-muted-foreground">
                          <p>
                            {t('settings.about.openSourceNoticePrefix', { defaultValue: 'LeafTab Community Edition is open source under ' })}
                            <a
                              href="https://github.com/mason173/LeafTab/blob/main/LICENSE"
                              target="_blank"
                              rel="noreferrer"
                              className="text-foreground underline-offset-2 hover:underline"
                            >
                              GNU GPL v3.0
                            </a>
                            {t('settings.about.openSourceNoticeSuffix', { defaultValue: '. Issues and PRs are welcome on GitHub.' })}
                          </p>
                          <p>
                            {t('settings.about.thirdPartyLicenseNotice', {
                              defaultValue: 'Some third-party components follow their own licenses.',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-border/70 bg-secondary/14 px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="text-[12px] font-semibold text-foreground">
                          {t('settings.about.ackTitle')}
                        </div>
                        <div className="text-[10.5px] leading-[18px] text-muted-foreground">
                          {t('settings.about.ackDesc')}
                        </div>
                        <div className="space-y-1.5 pt-0.5">
                          <AboutMarqueeRow items={acknowledgementRows[0]} durationSeconds={30} />
                          <AboutMarqueeRow items={acknowledgementRows[1]} reverse durationSeconds={34} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-5 pb-4 pt-1.5">
              <ChangelogTimeline items={changelogItems} language={i18n.language} />
            </div>
          )}
        </div>

        {activeTab === 'about' ? (
          <div className="border-t border-border/60 px-5 pb-3 pt-2.5">
            <div className="mx-auto grid max-w-[860px] min-w-0 grid-cols-2 gap-2 md:grid-cols-4">
              <StoreLinkCard
                href="https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE"
                icon={<RiChromeFill className="h-4 w-4" />}
                label={t('settings.about.chromeStore')}
              />
              <StoreLinkCard
                href="https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn"
                icon={<RiEdgeFill className="h-4 w-4" />}
                label={t('settings.about.edgeStore')}
              />
              <StoreLinkCard
                href="https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/"
                icon={<RiFirefoxFill className="h-4 w-4" />}
                label={t('settings.about.firefoxStore')}
              />
              <StoreLinkCard
                href="https://github.com/mason173/LeafTab"
                icon={<RiGithubFill className="h-4 w-4" />}
                label={t('settings.about.github')}
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
