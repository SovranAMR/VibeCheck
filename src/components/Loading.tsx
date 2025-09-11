interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Loading({ message = 'Yükleniyor...', size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className={`${sizeClasses[size]} border-4 border-purple-400 border-t-transparent rounded-full animate-spin`}></div>
      <div className="text-slate-300">{message}</div>
    </div>
  );
}
