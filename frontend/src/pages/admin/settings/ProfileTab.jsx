import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineUser, HiOutlineEye, HiOutlineEyeOff,
  HiOutlineSave,
} from 'react-icons/hi';
import { settingsApi } from '../../../services/settings.service';
import useAuth from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';

const ProfileTab = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [form, setForm] = useState({ fullName: '', phoneNumber: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getProfile();
      const p = res.data.data.profile;
      setProfile(p);
      setForm({ fullName: p.fullName || '', phoneNumber: p.phoneNumber || '' });
    } catch {
      toast.error('Không thể tải hồ sơ', 'Lỗi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error('Họ tên không được để trống', 'Lỗi');
    try {
      setSaving(true);
      const res = await settingsApi.updateProfile(form);
      setProfile(res.data.data.profile);
      toast.success('Cập nhật hồ sơ thành công', 'Thành công');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lưu thất bại', 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toast.error('Mật khẩu xác nhận không khớp', 'Lỗi');
    }
    if (pwForm.newPassword.length < 8) {
      return toast.error('Mật khẩu mới phải có ít nhất 8 ký tự', 'Lỗi');
    }
    try {
      setChangingPw(true);
      await settingsApi.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Đổi mật khẩu thành công', 'Thành công');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Đổi mật khẩu thất bại', 'Lỗi');
    } finally {
      setChangingPw(false);
    }
  };

  const initials = profile?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="settings-spinner" />
        <span>Đang tải...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Avatar + Info Card */}
      <div className="settings-card">
        <div className="settings-card__title"><HiOutlineUser className="settings-card__title-icon" /> Thông Tin Cá Nhân</div>
        <div className="settings-card__divider" />

        <div className="settings-avatar-row">
          <div className="settings-avatar">{initials}</div>
          <div className="settings-avatar__info">
            <div className="settings-avatar__name">{profile?.fullName}</div>
            <div className="settings-avatar__role">ADMIN</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Tham gia: {new Date(profile?.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleSaveProfile}>
          <div className="settings-form-row">
            <div className="settings-field">
              <label className="settings-field__label">Họ và tên</label>
              <input
                id="settings-fullname"
                className="settings-input"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Nhập họ và tên"
              />
            </div>
            <div className="settings-field">
              <label className="settings-field__label">Số điện thoại</label>
              <input
                id="settings-phone"
                className="settings-input"
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="Nhập số điện thoại"
              />
            </div>
          </div>
          <div className="settings-field">
            <label className="settings-field__label">Email <span className="settings-field__label-badge">Readonly</span></label>
            <input className="settings-input" value={profile?.email || ''} readOnly disabled />
            <span className="settings-field__hint">Email không thể thay đổi sau khi đăng ký</span>
          </div>
          <div className="settings-form-actions">
            <button id="settings-save-profile" className="settings-btn settings-btn--primary" type="submit" disabled={saving}>
              {saving ? <div className="settings-spinner" /> : <HiOutlineSave />}
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="settings-card">
        <div className="settings-card__title">🔒 Đổi Mật Khẩu</div>
        <div className="settings-card__divider" />
        <form className="settings-form" onSubmit={handleChangePassword}>
          <div className="settings-field">
            <label className="settings-field__label">Mật khẩu hiện tại</label>
            <div className="settings-input-wrap">
              <input
                id="settings-current-pw"
                className="settings-input"
                type={showCurrentPw ? 'text' : 'password'}
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Nhập mật khẩu hiện tại"
              />
              <button type="button" className="settings-input-eye" onClick={() => setShowCurrentPw((v) => !v)}>
                {showCurrentPw ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
          </div>
          <div className="settings-form-row">
            <div className="settings-field">
              <label className="settings-field__label">Mật khẩu mới</label>
              <div className="settings-input-wrap">
                <input
                  id="settings-new-pw"
                  className="settings-input"
                  type={showNewPw ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Tối thiểu 8 ký tự"
                />
                <button type="button" className="settings-input-eye" onClick={() => setShowNewPw((v) => !v)}>
                  {showNewPw ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                </button>
              </div>
            </div>
            <div className="settings-field">
              <label className="settings-field__label">Xác nhận mật khẩu mới</label>
              <div className="settings-input-wrap">
                <input
                  id="settings-confirm-pw"
                  className="settings-input"
                  type={showConfirmPw ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button type="button" className="settings-input-eye" onClick={() => setShowConfirmPw((v) => !v)}>
                  {showConfirmPw ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                </button>
              </div>
            </div>
          </div>
          <div className="settings-form-actions">
            <button id="settings-change-pw-btn" className="settings-btn settings-btn--primary" type="submit" disabled={changingPw}>
              {changingPw ? <div className="settings-spinner" /> : '🔒'}
              {changingPw ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileTab;
