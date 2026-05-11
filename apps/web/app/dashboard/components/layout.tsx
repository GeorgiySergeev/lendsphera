export default function ComponentsLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="-mx-4 -my-5 sm:-mx-6 lg:-mx-8">{children}</div>;
}
