<?php
/**
 * Fleet Studio — Server Configuration (Private)
 * Keep this file secure on Hostinger. It is blocked from public access by .htaccess.
 */

// 1. Master GitHub Personal Access Token (Requires repo & workflow permissions)
// Paste your GitHub PAT here, or set as GITHUB_TOKEN environment variable in Hostinger.
define('GITHUB_TOKEN', getenv('GITHUB_TOKEN') ?: 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN');

// 2. User Accounts & Channel Permissions
// Each user ONLY sees and operates their assigned channels.
// They can log in with username + password/pin, or using their direct magic login key.
$USERS = [
    'admin' => [
        'name'        => 'Ayub (Fleet Admin)',
        'password'    => 'admin7733', // Change this to your preferred admin password
        'magic_key'   => 'master-admin-fleet-key-7733',
        'is_admin'    => true,        // Can access and trigger ALL channels
        'channels'    => ['*']
    ],
    'shafqat' => [
        'name'        => 'Shafqat Chadiyo',
        'password'    => 'arte2026',  // Password or PIN for Shafqat
        'magic_key'   => 'shafqat-arte-psique-9281',
        'is_admin'    => false,
        'channels'    => ['el_arte_psique']
    ],
    'zahid' => [
        'name'        => 'Zahid Khurshid',
        'password'    => 'mejora2026',
        'magic_key'   => 'zahid-mejora-dia-4819',
        'is_admin'    => false,
        'channels'    => ['mejora_dia_a_dia']
    ],
    'brother' => [
        'name'        => 'Brother',
        'password'    => 'acero2026',
        'magic_key'   => 'brother-habitos-stoic-1934',
        'is_admin'    => false,
        'channels'    => ['habitos_de_acero', 'brother_stoic']
    ],
    'nephew' => [
        'name'        => 'Nephew',
        'password'    => 'enfoque2026',
        'magic_key'   => 'nephew-mente-enfoque-6214',
        'is_admin'    => false,
        'channels'    => ['nephew_neuro']
    ]
];

// 3. Channel Registry
$CHANNELS = [
    'sabiduria_diaria' => [
        'id'             => 'sabiduria_diaria',
        'name'           => 'Sabiduría Diaria',
        'owner'          => 'Ayub (Main)',
        'handle'         => '@sabiduriadiaria-g6p',
        'speaker'        => 'Dra. Nazareth Castellanos',
        'language'       => 'es',
        'niche'          => 'Neurociencia & Psicología',
        'schedule_hours' => 72,
        'repo'           => 'ayubkhokhar7733/youtube-motivational',
        'workflow'       => 'repurpose.yml',
        'color'          => 'amber',
        'badge'          => 'FLAGSHIP'
    ],
    'el_arte_psique' => [
        'id'             => 'el_arte_psique',
        'name'           => 'El Arte de la Psique 2.0',
        'owner'          => 'Shafqat Chadiyo',
        'handle'         => '@elartedelapsique2.0',
        'speaker'        => 'Carl Jung',
        'language'       => 'es',
        'niche'          => 'Psicología Profunda & Filosofía',
        'schedule_hours' => 72,
        'repo'           => 'ayubkhokhar7733/channel-el-arte-psique',
        'workflow'       => 'repurpose.yml',
        'color'          => 'amber',
        'badge'          => 'FAMILY'
    ],
    'mejora_dia_a_dia' => [
        'id'             => 'mejora_dia_a_dia',
        'name'           => 'Mejora Día a Día',
        'owner'          => 'Zahid Khurshid',
        'handle'         => '@betterdaybyday0',
        'speaker'        => 'Dra. Nazareth Castellanos',
        'language'       => 'es',
        'niche'          => 'Neurociencia & Mejora Personal',
        'schedule_hours' => 72,
        'repo'           => 'ayubkhokhar7733/channel-mejora-dia-a-dia',
        'workflow'       => 'repurpose.yml',
        'color'          => 'amber',
        'badge'          => 'FAMILY'
    ],
    'habitos_de_acero' => [
        'id'             => 'habitos_de_acero',
        'name'           => 'Hábitos de Acero',
        'owner'          => 'Brother',
        'handle'         => '@HábitosdeAcero2008',
        'speaker'        => 'Dr Mario',
        'language'       => 'es',
        'niche'          => 'Desarrollo Personal & Liderazgo',
        'schedule_hours' => 72,
        'repo'           => 'ayubkhokhar7733/channel-habitos-acero',
        'workflow'       => 'repurpose.yml',
        'color'          => 'rose',
        'badge'          => 'FAMILY'
    ],
    'brother_stoic' => [
        'id'             => 'brother_stoic',
        'name'           => 'The Stoic Frontier',
        'owner'          => 'Brother',
        'handle'         => '@stoicfrontier',
        'speaker'        => 'Marcus Aurelius / Seneca',
        'language'       => 'en',
        'niche'          => 'Stoic Philosophy & Resilience',
        'schedule_hours' => 48,
        'repo'           => 'ayubkhokhar7733/channel-stoic-frontier',
        'workflow'       => 'repurpose.yml',
        'color'          => 'indigo',
        'badge'          => 'FAMILY'
    ],
    'nephew_neuro' => [
        'id'             => 'nephew_neuro',
        'name'           => 'Mente & Enfoque',
        'owner'          => 'Nephew',
        'handle'         => '@mente-enfoque',
        'speaker'        => 'Dra. Marian Rojas Estapé',
        'language'       => 'es',
        'niche'          => 'Psiquiatría & Manejo del Estrés',
        'schedule_hours' => 72,
        'repo'           => 'ayubkhokhar7733/channel-mente-enfoque',
        'workflow'       => 'repurpose.yml',
        'color'          => 'emerald',
        'badge'          => 'FAMILY'
    ]
];
