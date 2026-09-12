import { siteConfig } from '../config/site';
import type { StudioMember } from '../types/member';
import { createPublicClient } from './supabase';

interface MemberRow {
  id: string;
  name: string;
  role: string;
  instagram_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

export const fallbackMembers: StudioMember[] = siteConfig.members.map((name, index) => ({
  id: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name,
  role: 'Parte de B&Z Studios',
  sortOrder: index,
  isVisible: true,
}));

export async function getPublicMembers(): Promise<StudioMember[]> {
  const client = createPublicClient();
  if (!client) return fallbackMembers;

  const { data, error } = await client
    .from('site_members')
    .select('id, name, role, instagram_url, sort_order, is_visible')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return fallbackMembers;

  return (data as MemberRow[]).map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    instagramUrl: member.instagram_url ?? undefined,
    sortOrder: member.sort_order,
    isVisible: member.is_visible,
  }));
}
