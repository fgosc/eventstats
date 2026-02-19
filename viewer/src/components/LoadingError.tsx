interface Props {
  loading: boolean;
  error: string | null;
}

export function LoadingError({ loading, error }: Props) {
  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "red" }}>エラー: {error}</p>;
  return null;
}
