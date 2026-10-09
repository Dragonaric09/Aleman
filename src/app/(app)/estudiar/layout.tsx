import { StudyTabs } from "@/components/reading/study-tabs";

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StudyTabs />
      {children}
    </>
  );
}
