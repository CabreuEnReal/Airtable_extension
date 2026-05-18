import type { EmailMessage } from '../types/models';

const ME = { name: 'Carlos Abreu', email: 'carlosa@energiareal.mx' };

function nameFromEmail(email: string): string {
    const local = email.split('@')[0];
    return local
        .split(/[._-]/)
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
}

export function getMockEmails(contactEmail: string): EmailMessage[] {
    const contact = { name: nameFromEmail(contactEmail), email: contactEmail };

    return [
        {
            id: '1',
            subject: 'Propuesta técnica — Parque Solar Monterrey Norte',
            bodyPreview: 'Estimado Carlos, adjunto la propuesta técnica actualizada con las especificaciones del inversor SMA 100kW...',
            body: `Estimado Carlos,\n\nAdjunto la propuesta técnica actualizada con las especificaciones del inversor SMA 100kW para el proyecto Monterrey Norte.\n\nPuntos clave:\n- Capacidad total: 2.4 MW\n- Paneles: Canadian Solar 550W monocristalino\n- Inversores: SMA Sunny Tripower 100-20\n- Tiempo de retorno: 6.2 años\n\nQuedo a tus órdenes para cualquier duda.\n\nSaludos,\n${contact.name}`,
            from: contact,
            isRead: true,
            receivedDateTime: '2026-05-16T14:32:00Z',
            hasAttachments: true,
            replies: [
                {
                    id: '1-r1',
                    subject: 'RE: Propuesta técnica — Parque Solar Monterrey Norte',
                    bodyPreview: 'Gracias por la propuesta. Tenemos dudas sobre el esquema financiero y la tasa de degradación...',
                    body: `Hola,\n\nGracias por la propuesta. La revisamos internamente y tenemos algunas dudas:\n\n1. ¿El tiempo de retorno de 6.2 años considera la tasa de degradación anual de los paneles?\n2. ¿Se puede ajustar a un esquema PPA en lugar de venta directa?\n\nQuedamos atentos.\n\nCarlos Abreu\nMEGAWATTS SAPI DE CV`,
                    from: ME,
                    isRead: true,
                    receivedDateTime: '2026-05-16T16:00:00Z',
                    hasAttachments: false,
                },
                {
                    id: '1-r2',
                    subject: 'RE: RE: Propuesta técnica — Parque Solar Monterrey Norte',
                    bodyPreview: 'Claro, el tiempo de retorno sí considera degradación anual del 0.5%. Respecto al PPA podemos estructurarlo...',
                    body: `Hola Carlos,\n\nRespondemos sus dudas:\n\n1. Sí, el cálculo considera una degradación anual del 0.5% en los módulos, estándar del fabricante.\n2. Podemos estructurarlo como PPA a 20 años con tarifa preferencial garantizada. Les enviamos el addendum esta semana.\n\nSaludos,\n${contact.name}`,
                    from: contact,
                    isRead: false,
                    receivedDateTime: '2026-05-17T08:45:00Z',
                    hasAttachments: false,
                },
            ],
        },
        {
            id: '2',
            subject: 'Seguimiento — Reunión CFE Esquema PPA',
            bodyPreview: 'Buenas tardes Carlos, como acordamos en la reunión de ayer, adjunto el resumen de puntos clave...',
            body: `Buenas tardes Carlos,\n\nComo acordamos en la reunión de ayer con CFE, adjunto el resumen de puntos:\n\n1. CFE solicita garantía de performance ratio mínimo 82%\n2. Plazo de contrapropuesta: 20 de mayo\n3. Esquema PPA a 20 años preferido por ambas partes\n\nFavor de confirmar recibido.\n\nSaludos,\n${contact.name}`,
            from: contact,
            isRead: false,
            receivedDateTime: '2026-05-17T09:15:00Z',
            hasAttachments: false,
        },
        {
            id: '3',
            subject: 'Documentos requeridos — Permiso CRE #2024-089',
            bodyPreview: 'Hola, adjunto los documentos solicitados para el expediente ante la CRE en su modalidad de autoabasto...',
            body: `Hola Carlos,\n\nAdjunto los documentos para el expediente #2024-089 ante la CRE:\n\n• Memoria técnica descriptiva\n• Planos eléctricos aprobados\n• Estudio de impacto ambiental\n• Póliza de responsabilidad civil\n\nFavor confirmar recepción antes del viernes.\n\nSaludos,\n${contact.name}`,
            from: contact,
            isRead: true,
            receivedDateTime: '2026-05-15T11:00:00Z',
            hasAttachments: true,
            replies: [
                {
                    id: '3-r1',
                    subject: 'RE: Documentos requeridos — Permiso CRE #2024-089',
                    bodyPreview: 'Confirmamos recepción de los documentos. Los revisaremos y enviamos feedback esta tarde...',
                    body: `Hola,\n\nConfirmamos recepción de todos los documentos. Los revisaremos hoy y les enviamos feedback esta tarde.\n\nSaludos,\nCarlos Abreu\nMEGAWATTS SAPI DE CV`,
                    from: ME,
                    isRead: true,
                    receivedDateTime: '2026-05-15T13:30:00Z',
                    hasAttachments: false,
                },
            ],
        },
        {
            id: '4',
            subject: 'Cotización actualizada — Q2 2026',
            bodyPreview: 'Estimado Carlos, por ajustes arancelarios actualizamos la cotización para su proyecto, validad hasta el 31 de mayo...',
            body: `Estimado Carlos,\n\nPor ajustes arancelarios vigentes desde abril 2026, actualizamos la cotización:\n\n- Módulos Canadian Solar: +3.2%\n- Inversores Huawei: +1.8%\n- Estructura de montaje: sin cambio\n\nLa cotización tiene validez hasta el 31 de mayo 2026. Adjunto el Excel con el desglose completo.\n\nSaludos comerciales,\n${contact.name}`,
            from: contact,
            isRead: false,
            receivedDateTime: '2026-05-14T16:45:00Z',
            hasAttachments: true,
        },
    ];
}
