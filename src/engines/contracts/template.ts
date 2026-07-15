import { formatJalali, toPersianDigits } from "@/core/i18n/jalali";

/**
 * Standard 10-article consulting-services contract template, rendered as
 * Markdown with the real client/deal values substituted in. This is the
 * default body a new contract starts from; the Markdown editor lets a
 * consultant customize it further, and the AI rewrite personalizes it.
 */

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
}

function money(n: number): string {
  return toPersianDigits(new Intl.NumberFormat("en-US").format(Math.round(n)));
}

export function buildContractTemplate(input: ContractTemplateInput): string {
  const clientLine = input.companyName
    ? `${input.companyName} (نماینده: ${input.clientName})`
    : input.clientName;
  const p1 = Math.round(input.amount * 0.4);
  const p2 = Math.round(input.amount * 0.3);
  const p3 = input.amount - p1 - p2;

  return `# قرارداد خدمات مشاوره

**شماره قرارداد:** ${input.contractNo}
**تاریخ تنظیم:** ${formatJalali(new Date())}

## ماده ۱ — طرفین قرارداد

این قرارداد فی‌مابین **${input.providerName}** («مشاور») از یک طرف، و **${clientLine}** («کارفرما») از طرف دیگر، با شرایط ذیل منعقد می‌گردد.

## ماده ۲ — موضوع قرارداد

موضوع این قرارداد ارائه‌ی خدمات مشاوره‌ی کسب‌وکار با محوریت زیر است:

> ${input.subject}

ارائه‌ی خدمات بر اساس متدولوژی «چهار رکن» (تحلیل وضعیت موجود، طراحی راهکار، پیاده‌سازی، و پایش نتایج) صورت می‌گیرد.

## ماده ۳ — مدت قرارداد

مدت اجرای این قرارداد **${input.durationLabel}** از تاریخ **${formatJalali(input.startDate)}** خواهد بود. تمدید قرارداد منوط به توافق کتبی طرفین است.

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
