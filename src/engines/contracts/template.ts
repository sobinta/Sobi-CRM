import { formatContractDate, toPersianDigits } from "@/core/i18n/jalali";

/**
 * Contract-text template registry. Each template is a full Markdown
 * generator producing a Persian-language legal document (the document itself
 * is not translated per UI locale — it's the actual legal text a client
 * signs, matching how the original single template worked). The consultant
 * picks a template matching the type of service the contact wants; the
 * Markdown editor lets them customize further, and the AI rewrite
 * personalizes it.
 */

export type ContractTemplateKey = "consulting" | "development" | "retainer" | "oneTime";

export const CONTRACT_TEMPLATES: { key: ContractTemplateKey; nameKey: string }[] = [
  { key: "consulting", nameKey: "consulting" },
  { key: "development", nameKey: "development" },
  { key: "retainer", nameKey: "retainer" },
  { key: "oneTime", nameKey: "oneTime" },
];

export interface ContractTemplateInput {
  contractNo: string;
  providerName: string;
  clientName: string;
  companyName?: string;
  subject: string;
  amount: number;
  currency: string;
  startDate: Date;
  durationLabel: string;
  calendarMode: string;
}

function money(n: number): string {
  return toPersianDigits(new Intl.NumberFormat("en-US").format(Math.round(n)));
}

function clientLineOf(input: ContractTemplateInput): string {
  return input.companyName
    ? `${input.companyName} (نماینده: ${input.clientName})`
    : input.clientName;
}

function buildConsulting(input: ContractTemplateInput): string {
  const clientLine = clientLineOf(input);
  const p1 = Math.round(input.amount * 0.4);
  const p2 = Math.round(input.amount * 0.3);
  const p3 = input.amount - p1 - p2;

  return `# قرارداد خدمات مشاوره

**شماره قرارداد:** ${input.contractNo}
**تاریخ تنظیم:** ${formatContractDate(new Date(), input.calendarMode)}

## ماده ۱ — طرفین قرارداد

این قرارداد فی‌مابین **${input.providerName}** («مشاور») از یک طرف، و **${clientLine}** («کارفرما») از طرف دیگر، با شرایط ذیل منعقد می‌گردد.

## ماده ۲ — موضوع قرارداد

موضوع این قرارداد ارائه‌ی خدمات مشاوره‌ی کسب‌وکار با محوریت زیر است:

> ${input.subject}

ارائه‌ی خدمات بر اساس متدولوژی «چهار رکن» (تحلیل وضعیت موجود، طراحی راهکار، پیاده‌سازی، و پایش نتایج) صورت می‌گیرد.

## ماده ۳ — مدت قرارداد

مدت اجرای این قرارداد **${input.durationLabel}** از تاریخ **${formatContractDate(input.startDate, input.calendarMode)}** خواهد بود. تمدید قرارداد منوط به توافق کتبی طرفین است.

## ماده ۴ — مبلغ و نحوه‌ی پرداخت

مبلغ کل این قرارداد **${money(input.amount)} ${input.currency}** است که به‌صورت مرحله‌ای و به شرح زیر پرداخت می‌شود:

| مرحله | درصد | مبلغ |
|---|---|---|
| پیش‌پرداخت (آغاز کار) | ۴۰٪ | ${money(p1)} ${input.currency} |
| میان‌دوره (تحویل گزارش میانی) | ۳۰٪ | ${money(p2)} ${input.currency} |
| تسویه نهایی (تحویل نهایی) | ۳۰٪ | ${money(p3)} ${input.currency} |

## ماده ۵ — تعهدات مشاور

مشاور متعهد است خدمات موضوع قرارداد را با کیفیت حرفه‌ای، در چارچوب زمان‌بندی توافق‌شده و مطابق استانداردهای شناخته‌شده‌ی صنعت ارائه دهد.

## ماده ۶ — تعهدات کارفرما

کارفرما متعهد است اطلاعات و دسترسی‌های لازم برای انجام کار را در اختیار مشاور قرار دهد و پرداخت‌ها را طبق زمان‌بندی ماده ۴ انجام دهد.

## ماده ۷ — محرمانگی

طرفین متعهد می‌شوند کلیه‌ی اطلاعات محرمانه‌ی مبادله‌شده در طول اجرای این قرارداد را نزد خود محفوظ نگه داشته و بدون رضایت کتبی طرف مقابل به اشخاص ثالث افشا نکنند.

## ماده ۸ — مالکیت نتایج کار

کلیه‌ی مستندات، گزارش‌ها و خروجی‌های تولیدشده در چارچوب این قرارداد، پس از تسویه‌ی کامل، متعلق به کارفرما خواهد بود.

## ماده ۹ — فسخ قرارداد

هر یک از طرفین می‌تواند با اعلام کتبی ۱۵ روزه، قرارداد را فسخ کند؛ در این صورت، مبالغ متناسب با کار انجام‌شده تسویه خواهد شد.

## ماده ۱۰ — حل اختلاف

در صورت بروز هرگونه اختلاف در تفسیر یا اجرای این قرارداد، طرفین ابتدا از طریق مذاکره و در صورت عدم حصول توافق، از طریق مراجع قانونی ذی‌صلاح اقدام خواهند کرد.

---

این قرارداد در ۱۰ ماده تنظیم و به امضای طرفین رسید.
`;
}

function buildDevelopment(input: ContractTemplateInput): string {
  const clientLine = clientLineOf(input);
  const p1 = Math.round(input.amount * 0.3);
  const p2 = Math.round(input.amount * 0.4);
  const p3 = input.amount - p1 - p2;

  return `# قرارداد توسعه‌ی نرم‌افزار

**شماره قرارداد:** ${input.contractNo}
**تاریخ تنظیم:** ${formatContractDate(new Date(), input.calendarMode)}

## ماده ۱ — طرفین قرارداد

این قرارداد فی‌مابین **${input.providerName}** («پیمانکار») از یک طرف، و **${clientLine}** («کارفرما») از طرف دیگر، با شرایط ذیل منعقد می‌گردد.

## ماده ۲ — موضوع و دامنه‌ی کار

موضوع این قرارداد طراحی و توسعه‌ی نرم‌افزار با مشخصات زیر است:

> ${input.subject}

هرگونه درخواست خارج از دامنه‌ی توافق‌شده («تغییر دامنه») نیازمند تفاهم‌نامه‌ی جداگانه و تعدیل مبلغ/زمان‌بندی است.

## ماده ۳ — مدت اجرا و تحویل

مدت اجرای این پروژه **${input.durationLabel}** از تاریخ **${formatContractDate(input.startDate, input.calendarMode)}** است. نسخه‌ی نهایی طی این بازه تحویل کارفرما می‌شود.

## ماده ۴ — مبلغ و نحوه‌ی پرداخت

مبلغ کل این قرارداد **${money(input.amount)} ${input.currency}** است که به شرح زیر پرداخت می‌شود:

| مرحله | درصد | مبلغ |
|---|---|---|
| پیش‌پرداخت (شروع پروژه) | ۳۰٪ | ${money(p1)} ${input.currency} |
| تحویل نسخه‌ی آزمایشی (بتا) | ۴۰٪ | ${money(p2)} ${input.currency} |
| تحویل نهایی و استقرار | ۳۰٪ | ${money(p3)} ${input.currency} |

## ماده ۵ — آزمون پذیرش

پس از تحویل هر نسخه، کارفرما حداکثر ۷ روز کاری فرصت آزمون و اعلام ایرادات را دارد؛ عدم اعلام در این بازه به منزله‌ی پذیرش تلقی می‌شود.

## ماده ۶ — دوره‌ی پشتیبانی رفع اشکال

پیمانکار متعهد است به مدت ۳۰ روز پس از تحویل نهایی، اشکالات نرم‌افزاری (باگ) را بدون هزینه‌ی اضافی رفع نماید. این دوره شامل توسعه‌ی قابلیت جدید نمی‌شود.

## ماده ۷ — مالکیت فکری و کد منبع

با تسویه‌ی کامل مبلغ قرارداد، کلیه‌ی حقوق مالکیت فکری و کد منبع تولیدشده به کارفرما منتقل می‌شود؛ تا پیش از آن، مالکیت نزد پیمانکار باقی می‌ماند.

## ماده ۸ — محرمانگی

طرفین متعهد می‌شوند اطلاعات محرمانه‌ی مبادله‌شده را نزد خود محفوظ نگه داشته و بدون رضایت کتبی طرف مقابل افشا نکنند.

## ماده ۹ — فسخ قرارداد

هر یک از طرفین می‌تواند با اعلام کتبی ۱۵ روزه، قرارداد را فسخ کند؛ در این صورت، مبالغ متناسب با کار انجام‌شده و تحویل‌شده تسویه خواهد شد.

## ماده ۱۰ — حل اختلاف

در صورت بروز اختلاف، طرفین ابتدا از طریق مذاکره و در صورت عدم توافق، از طریق مراجع قانونی ذی‌صلاح اقدام خواهند کرد.

---

این قرارداد در ۱۰ ماده تنظیم و به امضای طرفین رسید.
`;
}

function buildRetainer(input: ContractTemplateInput): string {
  const clientLine = clientLineOf(input);

  return `# قرارداد همکاری ماهانه (رتینر)

**شماره قرارداد:** ${input.contractNo}
**تاریخ تنظیم:** ${formatContractDate(new Date(), input.calendarMode)}

## ماده ۱ — طرفین قرارداد

این قرارداد فی‌مابین **${input.providerName}** («ارائه‌دهنده») از یک طرف، و **${clientLine}** («کارفرما») از طرف دیگر، با شرایط ذیل منعقد می‌گردد.

## ماده ۲ — موضوع قرارداد

موضوع این قرارداد ارائه‌ی مستمر خدمات زیر به‌صورت ماهانه است:

> ${input.subject}

## ماده ۳ — مدت و تمدید

این قرارداد از تاریخ **${formatContractDate(input.startDate, input.calendarMode)}** آغاز می‌شود و به‌صورت ماهانه به‌طور خودکار تمدید می‌گردد، مگر آنکه هر یک از طرفین طبق ماده ۷ آن را فسخ کند. مدت اولیه‌ی توافق‌شده: **${input.durationLabel}**.

## ماده ۴ — مبلغ و نحوه‌ی پرداخت

مبلغ این همکاری **${money(input.amount)} ${input.currency} در ماه** است که در ابتدای هر دوره‌ی ماهانه صادر و حداکثر ظرف ۷ روز تسویه می‌شود.

## ماده ۵ — دامنه‌ی خدمات ماهانه

خدمات موضوع این قرارداد در چارچوب ساعات/ظرفیت توافق‌شده برای هر ماه ارائه می‌شود. ساعات استفاده‌نشده به ماه بعد منتقل نمی‌شود، مگر با توافق کتبی طرفین.

## ماده ۶ — گزارش‌دهی

ارائه‌دهنده متعهد است در پایان هر ماه، گزارش خلاصه‌ای از کارهای انجام‌شده را به کارفرما ارائه دهد.

## ماده ۷ — فسخ و اعلام لغو

هر یک از طرفین می‌تواند با اعلام کتبی حداقل ۳۰ روزه، این قرارداد را از پایان دوره‌ی جاری فسخ کند.

## ماده ۸ — محرمانگی

طرفین متعهد می‌شوند اطلاعات محرمانه‌ی مبادله‌شده را نزد خود محفوظ نگه داشته و بدون رضایت کتبی طرف مقابل افشا نکنند.

## ماده ۹ — مالکیت نتایج کار

خروجی‌های تولیدشده در هر دوره، پس از تسویه‌ی همان دوره، متعلق به کارفرما خواهد بود.

## ماده ۱۰ — حل اختلاف

در صورت بروز اختلاف، طرفین ابتدا از طریق مذاکره و در صورت عدم توافق، از طریق مراجع قانونی ذی‌صلاح اقدام خواهند کرد.

---

این قرارداد در ۱۰ ماده تنظیم و به امضای طرفین رسید.
`;
}

function buildOneTime(input: ContractTemplateInput): string {
  const clientLine = clientLineOf(input);
  const p1 = Math.round(input.amount * 0.5);
  const p2 = input.amount - p1;

  return `# قرارداد پروژه‌ی یک‌باره

**شماره قرارداد:** ${input.contractNo}
**تاریخ تنظیم:** ${formatContractDate(new Date(), input.calendarMode)}

## ماده ۱ — طرفین قرارداد

این قرارداد فی‌مابین **${input.providerName}** («ارائه‌دهنده») از یک طرف، و **${clientLine}** («کارفرما») از طرف دیگر، با شرایط ذیل منعقد می‌گردد.

## ماده ۲ — موضوع قرارداد

موضوع این قرارداد، ارائه‌ی یک تحویل‌دادنی مشخص و یک‌باره به شرح زیر است:

> ${input.subject}

## ماده ۳ — زمان‌بندی تحویل

تحویل نهایی موضوع این قرارداد حداکثر تا **${input.durationLabel}** از تاریخ **${formatContractDate(input.startDate, input.calendarMode)}** صورت می‌گیرد.

## ماده ۴ — مبلغ و نحوه‌ی پرداخت

مبلغ کل این قرارداد **${money(input.amount)} ${input.currency}** است که به شرح زیر پرداخت می‌شود:

| مرحله | درصد | مبلغ |
|---|---|---|
| پیش‌پرداخت (آغاز کار) | ۵۰٪ | ${money(p1)} ${input.currency} |
| تحویل نهایی | ۵۰٪ | ${money(p2)} ${input.currency} |

## ماده ۵ — دامنه‌ی کار

این قرارداد صرفاً شامل تحویل‌دادنی ذکرشده در ماده ۲ است؛ هرگونه کار اضافه نیازمند توافق و صورت‌حساب جداگانه است.

## ماده ۶ — تعهدات ارائه‌دهنده

ارائه‌دهنده متعهد است تحویل‌دادنی را با کیفیت حرفه‌ای و در موعد مقرر تحویل دهد.

## ماده ۷ — تعهدات کارفرما

کارفرما متعهد است اطلاعات لازم را در اختیار ارائه‌دهنده قرار داده و پرداخت‌ها را طبق ماده ۴ انجام دهد.

## ماده ۸ — محرمانگی

طرفین متعهد می‌شوند اطلاعات محرمانه‌ی مبادله‌شده را نزد خود محفوظ نگه داشته و بدون رضایت کتبی طرف مقابل افشا نکنند.

## ماده ۹ — مالکیت نتایج کار

با تسویه‌ی کامل مبلغ قرارداد، تحویل‌دادنی موضوع این قرارداد متعلق به کارفرما خواهد بود.

## ماده ۱۰ — حل اختلاف

در صورت بروز اختلاف، طرفین ابتدا از طریق مذاکره و در صورت عدم توافق، از طریق مراجع قانونی ذی‌صلاح اقدام خواهند کرد.

---

این قرارداد در ۱۰ ماده تنظیم و به امضای طرفین رسید.
`;
}

const BUILDERS: Record<ContractTemplateKey, (input: ContractTemplateInput) => string> = {
  consulting: buildConsulting,
  development: buildDevelopment,
  retainer: buildRetainer,
  oneTime: buildOneTime,
};

export function buildContractTemplate(
  templateKey: string,
  input: ContractTemplateInput,
): string {
  const builder = BUILDERS[templateKey as ContractTemplateKey] ?? buildConsulting;
  return builder(input);
}

export function isContractTemplateKey(key: string): key is ContractTemplateKey {
  return key in BUILDERS;
}
