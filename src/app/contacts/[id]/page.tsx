import { ContactWorkspace } from "@/features/contacts/ui/contact-workspace";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params;
  return <ContactWorkspace initialContactId={id} />;
}
