export interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

export interface LegalDocument {
  title: string;
  eyebrow: string;
  introduction: string[];
  sections: LegalSection[];
  references: Array<{ label: string; href: string }>;
  updatedAt: string;
}

export const termsDocument: LegalDocument = {
  title: 'Términos y condiciones de uso',
  eyebrow: 'Información legal',
  introduction: [
    'Estos Términos y Condiciones regulan el acceso y uso de bzstudios.com.ar, las cuentas de usuario, el sistema de calificaciones, los formularios de contacto y los videojuegos o contenidos ofrecidos por B&Z Studios.',
    'Al navegar por el sitio o crear una cuenta confirmás que leíste y comprendiste estas condiciones. Si no estás de acuerdo, podés utilizar las áreas públicas que no requieran aceptación contractual, pero no deberías crear una cuenta ni usar funciones reservadas a usuarios registrados.',
  ],
  sections: [
    {
      title: '1. Quién presta el servicio y alcance',
      paragraphs: [
        'B&Z Studios es un estudio de videojuegos que publica información institucional, presenta sus proyectos y permite jugar o acceder a determinados títulos desde la web. Las referencias a “B&Z Studios”, “nosotros”, “el sitio” o “el servicio” comprenden este portal y sus funciones asociadas.',
        'Estas condiciones se aplican a visitantes, usuarios registrados y personas que contacten al estudio. Algunos juegos pueden tener instrucciones, reglas o avisos particulares; cuando existan, se complementan con estos términos.',
      ],
    },
    {
      title: '2. Requisitos para utilizar el sitio',
      paragraphs: [
        'Podés navegar por el contenido público sin registrarte. Para calificar juegos, administrar tus calificaciones o acceder a tu perfil necesitás una cuenta, un correo electrónico válido y la confirmación de ese correo.',
        'Si sos menor de edad, debés usar el servicio con autorización y supervisión de tu madre, padre, tutor o representante legal. La persona adulta responsable debe revisar estas condiciones y acompañar cualquier solicitud vinculada con datos personales o eliminación de cuenta.',
      ],
    },
    {
      title: '3. Creación y seguridad de la cuenta',
      paragraphs: [
        'Al registrarte debés proporcionar información verdadera y mantenerla actualizada. El nombre de usuario debe ser único, tener entre 3 y 24 letras, números o guiones bajos y no puede contener espacios. No se permite elegir nombres que suplanten a otras personas, vulneren derechos, resulten ofensivos o generen confusión con B&Z Studios.',
        'La contraseña debe cumplir los requisitos indicados en el formulario. Sos responsable de mantenerla confidencial, cerrar sesión en equipos compartidos y avisarnos si sospechás un acceso no autorizado. B&Z Studios nunca te pedirá la contraseña por correo o por el formulario de contacto.',
      ],
    },
    {
      title: '4. Uso permitido',
      paragraphs: ['El sitio puede utilizarse para fines personales, informativos y de entretenimiento, respetando estos términos, la legislación aplicable y los derechos de terceros. Entre otros usos permitidos, podés:'],
      items: [
        'consultar información sobre B&Z Studios y sus videojuegos;',
        'jugar los títulos disponibles de acuerdo con sus controles y reglas;',
        'crear y administrar una cuenta personal;',
        'calificar juegos de forma genuina según tu propia experiencia;',
        'enviar ideas, consultas, sugerencias o reportes mediante el formulario de contacto.',
      ],
    },
    {
      title: '5. Conductas prohibidas',
      paragraphs: ['Para proteger a la comunidad, la infraestructura y los juegos, no está permitido:'],
      items: [
        'crear cuentas falsas, automatizadas o múltiples para alterar calificaciones;',
        'compartir, vender, ceder o permitir el uso no autorizado de una cuenta;',
        'intentar acceder a cuentas, datos, paneles administrativos o sistemas sin autorización;',
        'interferir con la seguridad, disponibilidad o funcionamiento del sitio mediante ataques, scraping abusivo, bots, malware o sobrecarga deliberada;',
        'eludir límites técnicos, controles de acceso o medidas contra abuso;',
        'copiar, modificar, distribuir o explotar comercialmente juegos, marcas, imágenes, código o contenidos sin autorización;',
        'usar el formulario para spam, amenazas, contenido ilegal, discriminatorio, engañoso o que vulnere derechos de terceros.',
      ],
    },
    {
      title: '6. Calificaciones y participación',
      paragraphs: [
        'Cada cuenta puede mantener una calificación por juego y modificarla o eliminarla desde las funciones disponibles. Las puntuaciones agregadas pueden mostrarse públicamente como promedio y cantidad total; el correo electrónico y la identidad individual del votante no se publican junto a ese promedio.',
        'Las calificaciones deben reflejar una experiencia real. Podemos anular puntuaciones manipuladas, automatizadas, fraudulentas o vinculadas con abuso del servicio. Esta moderación busca preservar la integridad del sistema y no implica una obligación de publicar o conservar cada interacción indefinidamente.',
      ],
    },
    {
      title: '7. Ideas, sugerencias y mensajes',
      paragraphs: [
        'Podés enviarnos ideas o sugerencias voluntariamente. Salvo que exista un acuerdo escrito específico, el envío no crea una relación de confidencialidad, sociedad, contratación ni obligación de desarrollar, remunerar o utilizar la propuesta.',
        'No envíes secretos comerciales, contraseñas, datos financieros, información médica ni datos personales de terceros. Conservás los derechos que correspondan sobre tu contenido, pero autorizás a B&Z Studios a leerlo, responderlo y utilizarlo internamente para evaluar o mejorar el sitio y los juegos.',
      ],
    },
    {
      title: '8. Propiedad intelectual',
      paragraphs: [
        'El nombre B&Z Studios, sus logotipos, identidad visual, textos, ilustraciones, interfaces, videos, música, personajes, videojuegos, código y demás contenidos propios están protegidos por las normas de propiedad intelectual aplicables. Las marcas o contenidos de terceros pertenecen a sus respectivos titulares.',
        'El acceso al sitio otorga únicamente un permiso personal, limitado, revocable, no exclusivo y no transferible para utilizar el servicio conforme a estos términos. No transfiere derechos de propiedad ni autoriza usos comerciales, obras derivadas o redistribución.',
      ],
    },
    {
      title: '9. Enlaces y servicios de terceros',
      paragraphs: [
        'El sitio puede enlazar redes sociales, plataformas de juego u otros servicios administrados por terceros. Sus contenidos, disponibilidad y prácticas se rigen por sus propias condiciones y políticas. B&Z Studios no controla esos servicios, aunque procuramos retirar enlaces que sepamos que son inseguros o incorrectos.',
      ],
    },
    {
      title: '10. Disponibilidad, cambios y mantenimiento',
      paragraphs: [
        'Trabajamos para mantener el sitio disponible y seguro, pero puede haber interrupciones por mantenimiento, mejoras, fallas técnicas, incidentes de terceros o causas fuera de nuestro control. Los juegos, funciones y contenidos pueden cambiar, pasar a desarrollo, dejar de estar disponibles o incorporar nuevas reglas.',
        'Cuando un cambio afecte de forma relevante una cuenta o función, procuraremos comunicarlo de manera razonable mediante el sitio o el correo registrado, según corresponda.',
      ],
    },
    {
      title: '11. Suspensión y eliminación de cuentas',
      paragraphs: [
        'Podemos limitar o suspender una cuenta cuando existan indicios razonables de fraude, manipulación de calificaciones, riesgos de seguridad, incumplimiento de estos términos o requerimientos legales. Cuando sea posible, evaluaremos el contexto antes de adoptar una medida definitiva.',
        'B&Z ID separa la identidad central de las cuentas o partidas de cada juego. Una medida puede limitar únicamente una función —por ejemplo, calificar—, una cuenta de juego concreta, un juego completo o, ante infracciones graves o reiteradas, todo el ecosistema. Vincular, desvincular o crear otra cuenta de juego no elimina una medida vigente ni autoriza a evadirla.',
        'Las medidas se registran con su motivo, alcance, fecha de inicio, duración cuando corresponda y un mensaje comprensible. Salvo que la seguridad de la investigación o una obligación legal lo impida, la persona afectada puede consultar la medida desde su perfil y presentar una apelación. La revisión puede confirmar, modificar o dejar sin efecto la decisión; no garantiza un resultado favorable.',
        'Podés solicitar o ejecutar la eliminación de tu cuenta desde el perfil. La eliminación comprende el perfil y las calificaciones asociadas, sin perjuicio de datos que deban conservarse temporalmente por seguridad, respaldo técnico, cumplimiento legal o defensa de derechos, según se explica en la Política de Privacidad.',
        'Desvincular un juego, borrar su partida y eliminar el B&Z ID son acciones diferentes. Cuando un juego incorpore la integración, informaremos el alcance de cada acción antes de confirmarla. Eliminar el B&Z ID no borra automáticamente datos que un proveedor o plataforma independiente deba administrar bajo sus propias reglas.',
      ],
    },
    {
      title: '12. Responsabilidad y derechos del consumidor',
      paragraphs: [
        'El sitio y los juegos se ofrecen con el alcance y las características informadas en cada página. Nada de estos términos excluye garantías, responsabilidades o derechos que resulten obligatorios conforme a la Ley 24.240, el Código Civil y Comercial de la Nación u otras normas aplicables.',
        'En la máxima medida permitida por la ley, B&Z Studios no responde por interrupciones inevitables, daños causados exclusivamente por terceros, uso contrario a las instrucciones, pérdida de acceso provocada por el propio usuario o contenido externo fuera de nuestro control. Esta aclaración no limita la responsabilidad que legalmente no pueda excluirse.',
      ],
    },
    {
      title: '13. Privacidad y datos personales',
      paragraphs: [
        'El tratamiento de datos personales se explica en la Política de Privacidad, que forma parte de estas condiciones. Allí detallamos qué información se utiliza, con qué finalidad, quiénes pueden procesarla, durante cuánto tiempo se conserva y cómo ejercer tus derechos.',
      ],
    },
    {
      title: '14. Modificaciones de estos términos',
      paragraphs: [
        'Podemos actualizar estas condiciones para reflejar cambios legales, técnicos o funcionales. La fecha de la versión vigente se indica al final. Los cambios relevantes se comunicarán de forma visible y regirán hacia el futuro; continuar usando funciones que requieren cuenta después de su entrada en vigencia implica aceptar la versión actualizada.',
      ],
    },
    {
      title: '15. Ley aplicable, reclamos y contacto',
      paragraphs: [
        'Estos términos se interpretan conforme a las leyes de la República Argentina. Si existe una relación de consumo, se respetarán las reglas de competencia y protección más favorables al consumidor. Antes de iniciar un reclamo formal, podés contactarnos para intentar resolver el problema de manera directa.',
        'Para consultas, reportes, solicitudes legales o reclamos relacionados con el servicio, utilizá el formulario de contacto disponible en bzstudios.com.ar/contacto/.',
      ],
    },
  ],
  references: [
    { label: 'Ley 24.240 de Defensa del Consumidor — texto actualizado', href: 'https://www.argentina.gob.ar/normativa/nacional/638/actualizacion' },
    { label: 'Código Civil y Comercial de la Nación — Ley 26.994', href: 'https://www.argentina.gob.ar/normativa/nacional/235975' },
  ],
  updatedAt: '22 de septiembre de 2026',
};

export const privacyDocument: LegalDocument = {
  title: 'Política de privacidad',
  eyebrow: 'Tus datos',
  introduction: [
    'Esta Política de Privacidad explica de forma amplia y accesible cómo B&Z Studios recopila, utiliza, almacena y protege datos personales cuando visitás bzstudios.com.ar, creás una cuenta, calificás un juego o enviás un mensaje.',
    'Tratamos únicamente los datos razonablemente necesarios para prestar y proteger el servicio. No vendemos datos personales ni utilizamos la información de las cuentas para publicidad comportamental.',
  ],
  sections: [
    {
      title: '1. Responsable y canales de contacto',
      paragraphs: [
        'B&Z Studios es responsable de las decisiones sobre los datos tratados mediante este sitio. Para consultas de privacidad, solicitudes de acceso, actualización, rectificación, supresión o eliminación de cuenta, podés utilizar el formulario disponible en bzstudios.com.ar/contacto/ e indicar “Privacidad” como categoría o asunto.',
        'Para protegerte, podremos pedir información razonable que permita verificar que la solicitud proviene de la persona titular de la cuenta. Nunca solicitaremos tu contraseña.',
      ],
    },
    {
      title: '2. Datos que recopilamos',
      paragraphs: ['Según la función que utilices, podemos tratar las siguientes categorías:'],
      items: [
        'Datos de cuenta: correo electrónico, nombre de usuario, identificador interno, fecha de registro, confirmación del correo y fecha del último acceso.',
        'Datos de B&Z ID: identificador público, estado de la identidad central, cuentas de juegos vinculadas, plataforma, identificadores técnicos externos, fecha de vinculación y última verificación. Los códigos de vinculación se almacenan de forma temporal y protegida, no en texto legible.',
        'Datos de autenticación y seguridad: sesiones, eventos necesarios para prevenir accesos no autorizados y metadatos técnicos gestionados por el proveedor de autenticación. B&Z Studios no puede ver tu contraseña en texto legible.',
        'Actividad de juegos: puntuaciones asignadas, juego calificado y fechas de creación o modificación de la calificación.',
        'Datos de integridad y moderación: reportes, casos, motivo y alcance de medidas, advertencias, suspensiones, bloqueos, apelaciones, resoluciones y eventos de auditoría necesarios para proteger las cuentas y evitar que una sanción vigente sea eludida mediante nuevas vinculaciones.',
        'Comunicaciones: nombre, correo, categoría y contenido que ingresás voluntariamente en el formulario de contacto.',
        'Datos técnicos básicos: dirección IP, tipo de navegador, dispositivo, solicitudes y registros de error que los proveedores de alojamiento, seguridad o autenticación puedan generar para operar y proteger el servicio.',
      ],
    },
    {
      title: '3. Datos que no te pedimos',
      paragraphs: [
        'No solicitamos documentos de identidad, información bancaria, tarjetas, datos de salud, opiniones políticas, creencias religiosas ni otros datos sensibles para crear una cuenta o calificar juegos. No incluyas esa información ni contraseñas en formularios o mensajes.',
        'Actualmente el sitio no procesa pagos. Si en el futuro se incorporan compras, se informarán previamente el proveedor, los datos involucrados y las condiciones específicas.',
      ],
    },
    {
      title: '4. Finalidades del tratamiento',
      paragraphs: ['Utilizamos los datos para fines concretos y vinculados con el servicio:'],
      items: [
        'crear, confirmar y mantener la cuenta;',
        'crear y operar una identidad B&Z ID, vincular de forma segura cuentas de juegos compatibles y mostrarte su estado;',
        'permitir inicio de sesión, recuperación y cambio de contraseña;',
        'verificar que el nombre de usuario sea válido y único;',
        'guardar, mostrar de forma agregada y permitir administrar calificaciones;',
        'responder consultas, sugerencias y reportes;',
        'mantener la seguridad, investigar abusos y prevenir fraude o automatizaciones;',
        'aplicar medidas proporcionales con alcance definido, tramitar apelaciones y conservar una trazabilidad interna de decisiones sensibles;',
        'diagnosticar errores, mantener la disponibilidad y mejorar la experiencia;',
        'cumplir obligaciones legales y atender requerimientos válidos de autoridades competentes.',
      ],
    },
    {
      title: '5. Consentimiento y necesidad de los datos',
      paragraphs: [
        'Al crear una cuenta y marcar la casilla correspondiente prestás consentimiento para el tratamiento descrito en esta política. Algunos datos son necesarios para gestionar la relación de cuenta y prestar las funciones solicitadas; sin correo, nombre de usuario y datos de sesión no es posible ofrecer acceso autenticado.',
        'Podés retirar el consentimiento o pedir la eliminación de la cuenta. La solicitud no afecta la legitimidad del tratamiento realizado previamente y puede estar sujeta a excepciones legales o técnicas limitadas que se detallan más adelante.',
      ],
    },
    {
      title: '6. Visibilidad de la información',
      paragraphs: [
        'El nombre de usuario identifica tu perfil dentro del sistema. Las calificaciones se muestran públicamente solo de manera agregada mediante promedio y cantidad de votos. El correo electrónico, las sesiones, la dirección IP y la relación entre una persona concreta y su voto no se muestran públicamente.',
        'El personal administrador autorizado puede consultar cuentas y calificaciones individuales para gestionar el servicio, atender solicitudes, investigar manipulación o resolver incidentes. El acceso administrativo está restringido y requiere autenticación adicional.',
      ],
    },
    {
      title: '7. Cookies y almacenamiento local',
      paragraphs: [
        'Utilizamos cookies o mecanismos equivalentes estrictamente necesarios para mantener la sesión, recordar el estado de autenticación y proteger formularios. Sin esos mecanismos, las funciones de cuenta no podrían operar correctamente.',
        'A la fecha de esta política no utilizamos cookies publicitarias ni herramientas propias de seguimiento comportamental. Si se incorporaran analíticas no esenciales, se informará su finalidad y, cuando corresponda, se solicitará consentimiento antes de activarlas.',
      ],
    },
    {
      title: '8. Proveedores que procesan datos',
      paragraphs: [
        'Para operar el sitio utilizamos proveedores especializados que procesan datos siguiendo sus propias medidas de seguridad y las instrucciones asociadas al servicio contratado:',
      ],
      items: [
        'Supabase: autenticación, sesiones, base de datos y almacenamiento técnico.',
        'Vercel: alojamiento, distribución del sitio y registros técnicos necesarios para servir las páginas.',
        'Resend: envío de notificaciones del formulario de contacto, únicamente cuando esa integración está habilitada.',
      ],
    },
    {
      title: '9. Transferencias internacionales',
      paragraphs: [
        'Algunos proveedores pueden almacenar o procesar información fuera de la República Argentina. En esos casos procuramos utilizar servicios reconocidos y mecanismos contractuales o de seguridad adecuados para proteger la información, de acuerdo con los requisitos aplicables a las transferencias internacionales de datos.',
        'La ubicación concreta puede depender de la infraestructura elegida por cada proveedor. Podés contactarnos si necesitás información adicional sobre los destinatarios o garantías aplicables a tu caso.',
      ],
    },
    {
      title: '10. Plazos de conservación',
      paragraphs: [
        'Los datos de cuenta se conservan mientras la cuenta permanezca activa. Las calificaciones se conservan hasta que las elimines, elimines la cuenta o resulte necesario retirarlas por incumplimiento. Los mensajes de contacto se conservan durante el tiempo razonablemente necesario para responder, dar seguimiento y mantener un registro básico de la consulta.',
        'Los intentos y códigos de vinculación vencen y se eliminan o anonimizan cuando dejan de ser necesarios. Los datos de una cuenta de juego desvinculada dejan de utilizarse para iniciar sesiones o sincronizar actividad, aunque puede mantenerse un registro mínimo de la operación para seguridad y resolución de disputas.',
        'Los casos de moderación, apelaciones y eventos de auditoría pueden conservarse durante un período limitado después del cierre o eliminación cuando sea necesario para investigar fraude, impedir evasiones, demostrar cómo se tomó una decisión o atender obligaciones legales. El acceso queda restringido al personal autorizado según su función.',
        'Después de una eliminación pueden subsistir copias temporales en respaldos, registros de seguridad o sistemas de recuperación hasta completar sus ciclos técnicos. También podemos conservar información mínima cuando una norma lo exija o cuando resulte necesaria para investigar fraude, resolver disputas o defender derechos.',
      ],
    },
    {
      title: '11. Seguridad y confidencialidad',
      paragraphs: [
        'Aplicamos medidas técnicas y organizativas orientadas a evitar acceso, modificación, pérdida o divulgación no autorizada. Entre ellas se incluyen autenticación administrada, confirmación de correo, controles de acceso, políticas de base de datos, claves privadas solo del lado servidor y conexiones cifradas mediante HTTPS en producción.',
        'Ningún sistema conectado a Internet puede garantizar riesgo cero. Si detectamos un incidente relevante, evaluaremos su alcance, adoptaremos medidas de contención y realizaremos las comunicaciones exigidas por la normativa aplicable.',
      ],
    },
    {
      title: '12. Tus derechos',
      paragraphs: [
        'Conforme a la Ley 25.326 podés solicitar información sobre los datos vinculados con tu persona, acceder a ellos y pedir su actualización, rectificación, confidencialidad o supresión cuando corresponda. El derecho de acceso puede ejercerse gratuitamente en los términos previstos por la normativa.',
        'La Agencia de Acceso a la Información Pública informa que las solicitudes de acceso deben responderse dentro de 10 días corridos y que las solicitudes de rectificación, actualización o supresión deben atenderse dentro de 5 días hábiles. Si considerás que tu solicitud no fue atendida adecuadamente, podés presentar un reclamo ante la AAIP o ejercer la acción de hábeas data.',
      ],
      items: [
        'Acceso: conocer qué datos conservamos y con qué finalidad.',
        'Rectificación y actualización: corregir datos inexactos o desactualizados.',
        'Supresión: solicitar la eliminación cuando corresponda legalmente.',
        'Retiro del consentimiento: dejar de autorizar tratamientos basados en consentimiento, sin afectar operaciones anteriores.',
      ],
    },
    {
      title: '13. Cómo ejercer tus derechos o eliminar la cuenta',
      paragraphs: [
        'Podés cambiar el nombre de usuario, la contraseña, administrar calificaciones y descargar una copia estructurada de tus datos desde “Mi B&Z ID”. La eliminación definitiva de la identidad central también puede iniciarse desde esa sección mediante una nueva verificación de contraseña y una confirmación explícita.',
        'Cuando existan juegos compatibles, desde el mismo espacio podrás consultar vinculaciones y pedir su desvinculación. Una apelación de moderación se presenta desde la medida correspondiente; se conserva junto con el caso para que el equipo revisor pueda evaluar el contexto y comunicar la resolución.',
        'Para una solicitud más amplia, utilizá el formulario de contacto e incluí el correo asociado y una descripción clara. No envíes la contraseña. Responderemos por un medio que permita verificar la recepción y proteger la cuenta frente a solicitudes fraudulentas.',
      ],
    },
    {
      title: '14. Privacidad de menores de edad',
      paragraphs: [
        'El sitio no está diseñado para recopilar deliberadamente datos sensibles de menores. Si una persona menor crea una cuenta, debe hacerlo con autorización y supervisión de su representante legal. El representante puede contactarnos para ejercer derechos o solicitar eliminación.',
        'Si advertimos que una cuenta de una persona menor fue creada sin autorización cuando esta fuera necesaria, podremos restringirla mientras verificamos la situación y eliminar los datos que no corresponda conservar.',
      ],
    },
    {
      title: '15. Enlaces externos',
      paragraphs: [
        'Los enlaces hacia redes sociales, sitios de juegos u otras plataformas llevan a servicios independientes. Esta política no controla el tratamiento que realicen esos terceros; antes de proporcionarles información, revisá sus condiciones y políticas de privacidad.',
      ],
    },
    {
      title: '16. Cambios en esta política',
      paragraphs: [
        'Podemos actualizar esta política por cambios legales, técnicos o funcionales. Publicaremos la nueva versión con su fecha de actualización. Si el cambio modifica de manera relevante el uso de datos de una cuenta, procuraremos comunicarlo de forma visible o mediante el correo registrado antes de que resulte aplicable.',
      ],
    },
    {
      title: '17. Autoridad de control',
      paragraphs: [
        'La Agencia de Acceso a la Información Pública es la autoridad de aplicación de la Ley 25.326 en la República Argentina y recibe denuncias relacionadas con el incumplimiento de las normas de protección de datos personales. Sus canales y procedimientos oficiales están disponibles en argentina.gob.ar/aaip.',
      ],
    },
  ],
  references: [
    { label: 'Ley 25.326 de Protección de los Datos Personales — texto actualizado', href: 'https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion' },
    { label: 'AAIP — Derechos sobre tus datos personales', href: 'https://www.argentina.gob.ar/aaip/datospersonales/derechos' },
    { label: 'AAIP — Transferencias internacionales de datos', href: 'https://www.argentina.gob.ar/transferencias-internacionales' },
  ],
  updatedAt: '22 de septiembre de 2026',
};
