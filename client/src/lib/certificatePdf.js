import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function fullName(user) {
  return [user?.name, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Участник';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Генерирует PDF через HTML-рендер (кириллица через Inter/системные шрифты).
 */
export async function downloadCertificatePdf({
  user,
  olympiadTitle,
  score,
  maxScore,
  rank,
  participantsCount,
  issuedAt,
  code,
}) {
  const name = fullName(user);
  const dateStr = issuedAt
    ? new Date(issuedAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1123px;height:794px;z-index:-1;';
  host.innerHTML = `
    <div id="olimp-cert-root" style="
      width:1123px;height:794px;box-sizing:border-box;padding:28px;
      background:#fff;color:#1f2a32;
      font-family:Inter,Segoe UI,Arial,sans-serif;
      position:relative;
    ">
      <div style="
        border:4px solid #00e5bc;height:100%;box-sizing:border-box;
        padding:18px;display:flex;flex-direction:column;
      ">
        <div style="
          border:1px solid #00e5bc;flex:1;display:flex;flex-direction:column;
          overflow:hidden;
        ">
          <div style="
            background:#00e5bc;color:#fff;text-align:center;
            padding:14px 12px;font-weight:700;font-size:18px;letter-spacing:.02em;
          ">
            OLIMP · Олимпиадные задачи на Python
          </div>

          <div style="padding:28px 40px 18px;text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;">
            <img src="/olimp-logo-light.png" alt="OLIMP" style="width:240px;height:auto;margin-bottom:18px;" />
            <div style="font-size:42px;font-weight:800;letter-spacing:.08em;margin-bottom:10px;">СЕРТИФИКАТ</div>
            <div style="color:#6b7a86;font-size:16px;margin-bottom:10px;">настоящим подтверждается, что</div>
            <div style="font-size:34px;font-weight:800;margin-bottom:8px;">${escapeHtml(name)}</div>
            <div style="width:320px;height:2px;background:#00e5bc;margin:0 auto 16px;"></div>
            <div style="color:#6b7a86;font-size:16px;margin-bottom:8px;">успешно принял(а) участие в олимпиаде</div>
            <div style="font-size:24px;font-weight:700;margin-bottom:22px;">${escapeHtml(olympiadTitle || 'Олимпиада OLIMP')}</div>
            <div style="font-size:18px;font-weight:600;margin-bottom:6px;">Результат: ${escapeHtml(score)} / ${escapeHtml(maxScore)} баллов</div>
            <div style="font-size:18px;font-weight:600;margin-bottom:10px;">Место: ${escapeHtml(rank)} из ${escapeHtml(participantsCount)}</div>
            <div style="color:#6b7a86;font-size:15px;margin-bottom:6px;">Дата выдачи: ${escapeHtml(dateStr)}</div>
            ${
              code
                ? `<div style="color:#6b7a86;font-size:13px;">Код сертификата: ${escapeHtml(code)}</div>`
                : ''
            }
          </div>

          <div style="
            background:#00e5bc;color:#fff;text-align:center;
            padding:12px;font-weight:700;font-size:14px;
          ">
            Платформа OLIMP · курсовая работа 2026
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(host);

  try {
    // Ждём шрифты и картинку логотипа
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const img = host.querySelector('img');
    if (img && !img.complete) {
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }

    const node = host.querySelector('#olimp-cert-root');
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);

    const safeName = name.replace(/[^\wа-яА-ЯёЁ-]+/gi, '_');
    pdf.save(`OLIMP_certificate_${safeName}.pdf`);
  } finally {
    host.remove();
  }
}
