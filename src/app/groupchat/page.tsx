import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GroupChatClient, { type GroupChatInvitation, type GroupChatMember, type GroupChatMessage, type GroupChatPerson } from "./GroupChatClient";

export default async function GroupChatPage() {
  const supabase = await createClient();
  if (!supabase) return <main className="min-h-screen bg-[#f6f3ee] p-10 text-[#173f35]">Configurează Supabase pentru a activa groupchat-ul.</main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase.from("profiles").select("city, account_type").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  const [{ data: ownMembership }, { data: cityGroup }, { data: pendingInvites }] = await Promise.all([
    supabase.from("location_group_chat_members").select("group_chat_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("location_group_chats").select("id, city").eq("city", profile.city).maybeSingle(),
    supabase.from("location_group_chat_invitations").select("id, group_chat_id, inviter_id").eq("invitee_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
  ]);

  const groupId = ownMembership?.group_chat_id ?? cityGroup?.id ?? null;
  const isMember = Boolean(ownMembership && ownMembership.group_chat_id === groupId);
  const { data: selectedGroup } = groupId
    ? await supabase.from("location_group_chats").select("city").eq("id", groupId).maybeSingle()
    : { data: null };
  const groupCity = selectedGroup?.city ?? profile.city;
  let members: GroupChatMember[] = [];
  let messages: GroupChatMessage[] = [];
  let matchedPeople: GroupChatPerson[] = [];

  if (groupId) {
    const { data: memberRows } = await supabase.from("location_group_chat_members").select("user_id").eq("group_chat_id", groupId);
    const memberIds = [...new Set((memberRows ?? []).map((row) => row.user_id))];
    const { data: memberProfiles } = memberIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
      : { data: [] };
    members = (memberProfiles ?? []).map((member) => ({ id: member.id, displayName: member.display_name }));

    if (isMember) {
      const [{ data: messageRows }, { data: outgoing }, { data: incoming }] = await Promise.all([
        supabase.from("location_group_chat_messages").select("id, sender_id, body, created_at").eq("group_chat_id", groupId).order("created_at", { ascending: true }).limit(200),
        supabase.from("matches").select("matched_user_id").eq("user_id", user.id).eq("status", "matched"),
        supabase.from("matches").select("user_id").eq("matched_user_id", user.id).eq("status", "matched"),
      ]);
      messages = (messageRows ?? []) as GroupChatMessage[];
      const outgoingIds = new Set((outgoing ?? []).map((match) => match.matched_user_id));
      const reciprocalIds = [...new Set((incoming ?? []).map((match) => match.user_id).filter((id) => outgoingIds.has(id)))];
      const availableIds = reciprocalIds.filter((id) => !memberIds.includes(id));
      const { data: availableProfiles } = availableIds.length
        ? await supabase.from("profiles").select("id, display_name, city").in("id", availableIds).eq("city", groupCity)
        : { data: [] };
      matchedPeople = (availableProfiles ?? []).map((person) => ({ id: person.id, displayName: person.display_name }));
    }
  }

  let invitations: GroupChatInvitation[] = [];
  if (pendingInvites?.length) {
    const inviteGroupIds = [...new Set(pendingInvites.map((invite) => invite.group_chat_id))];
    const inviterIds = [...new Set(pendingInvites.map((invite) => invite.inviter_id))];
    const [{ data: inviteGroups }, { data: inviters }] = await Promise.all([
      supabase.from("location_group_chats").select("id, city").in("id", inviteGroupIds),
      supabase.from("profiles").select("id, display_name").in("id", inviterIds),
    ]);
    invitations = pendingInvites.flatMap((invite) => {
      const inviteGroup = inviteGroups?.find((item) => item.id === invite.group_chat_id);
      const inviter = inviters?.find((item) => item.id === invite.inviter_id);
      return inviteGroup && inviter ? [{ id: invite.id, groupChatId: invite.group_chat_id, city: inviteGroup.city, inviterName: inviter.display_name }] : [];
    });
  }

  return <GroupChatClient userId={user.id} city={groupCity} isStaff={profile.account_type === "staff"} groupChatId={groupId} isMember={isMember} members={members} initialMessages={messages} matchedPeople={matchedPeople} invitations={invitations} />;
}
