import { ContactWorkspace } from "@/features/contacts/ui/contact-workspace";

export default async function ContactPage({
  params,
}: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  return <ContactWorkspace initialContactId={id} />;
}
