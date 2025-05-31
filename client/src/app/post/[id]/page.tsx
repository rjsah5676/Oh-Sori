interface PageProps {
  params: {
    id: string;
  };
}

export default async function PostPage({ params }: PageProps) {
  return (
    <div>
      게시글 ID: 
    </div>
  );
}