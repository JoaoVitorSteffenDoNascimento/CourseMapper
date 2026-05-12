import { getInitials } from '../../app/app-utils.js';

export default function Avatar({ user, large = false }) {
  if (user?.avatarUrl) {
    return <img className={`avatar ${large ? 'large' : ''}`} src={user.avatarUrl} alt={`Foto de perfil de ${user.name}`} />;
  }
  return <div className={`avatar avatar-fallback ${large ? 'large' : ''}`}>{getInitials(user?.name)}</div>;
}
