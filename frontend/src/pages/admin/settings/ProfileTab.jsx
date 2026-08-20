import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiOutlineEye, HiOutlineEyeOff, HiOutlineSave, HiOutlineCamera,
  HiOutlineLockClosed,
} from 'react-icons/hi';
import { settingsApi } from '../../../services/settings.service';
import useAuth from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';

const ProfileTab = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);

  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview]     = useState(null);

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [form, setForm]     = useState({ fullName: '', phoneNumber: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  /* ── Load profile ──────────────────────────────────────── */
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getProfile();
      const p = res.data.data.profile;
      setProfile(p);
      setForm({ fullName: p.fullName || '', phoneNumber: p.phoneNumber || '' });
      // backend field is `avatar`, map to avatarUrl for display
      if (p.avatar) setAvatarPreview(p.avatar);
    } catch {
      toast.error('Không thể tải hồ sơ', 'Lỗi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* ── Avatar upload ─────────────────────────────────────── */
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      return toast.error('Vui lòng chọn file ảnh hợp lệ', 'Lỗi');
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Ảnh không được vượt quá 5 MB', 'Lỗi');
    }

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    try {
      setUploadingAvatar(true);
      const res = await settingsApi.uploadAvatar(file);
      // backend returns avatarUrl (mapped in controller) or profile.avatar
      const avatarUrl = res.data?.data?.avatarUrl || res.data?.data?.profile?.avatar;
      // Update auth context → topbar re-renders
      updateUser({ avatarUrl });
      setProfile((prev) => ({ ...prev, avatar: avatarUrl }));
      if (avatarUrl) setAvatarPreview(avatarUrl);
      toast.success('Cập nhật ảnh đại diện thành công', 'Thành công');
    } catch (err) {
      // Revert preview on error
      setAvatarPreview(profile?.avatar || null);
      toast.error(err.response?.data?.error?.message || 'Tải ảnh lên thất bại', 'Lỗi');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  /* ── Save profile info ─────────────────────────────────── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error('Họ tên không được để trống', 'Lỗi');
    try {
      setSaving(true);
      const res = await settingsApi.updateProfile(form);
      const updated = res.data.data.profile;
      setProfile(updated);
      updateUser({ fullName: updated.fullName, phoneNumber: updated.phoneNumber });
      toast.success('Cập nhật hồ sơ thành công', 'Thành công');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lưu thất bại', 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  /* ── Change password ───────────────────────────────────── */
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
  const displayAvatar = avatarPreview || profile?.avatar || null;

  /* ── Loading ───────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="settings-loading">
        <div className="settings-spinner" />
        <span>Đang tải...</span>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Personal Info Card ── */}
      <div className="settings-card">

        {/* Avatar + Identity row */}
        <div className="profile-hero">
          {/* Avatar with camera overlay */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {displayAvatar
                ? <img src={displayAvatar} alt="avatar" />
                : <span>{initials}</span>
              }
              {uploadingAvatar && (
                <div className="profile-avatar__uploading">
                  <div className="settings-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                </div>
              )}
            </div>
            <button
              type="button"
              id="settings-avatar-upload-btn"
              className="profile-avatar__camera"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              title="Thay đổi ảnh đại diện"
            >
              <HiOutlineCamera />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          {/* Identity info */}
          <div className="profile-identity">
            <div className="profile-identity__name">{profile?.fullName}</div>
            <div className="profile-identity__email">{profile?.email}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span className="settings-avatar__role">ADMIN</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                Tham gia: {new Date(profile?.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="settings-card__divider" />

        {/* Form fields */}
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
            <label className="settings-field__label">
              Email <span className="settings-field__label-badge">Readonly</span>
            </label>
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

      {/* ── Change Password Card ── */}
      <div className="settings-card">
        <div className="settings-card__title">
          <HiOutlineLockClosed className="settings-card__title-icon" /> Đổi Mật Khẩu
        </div>
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
              {changingPw ? <div className="settings-spinner" /> : <HiOutlineLockClosed />}
              {changingPw ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileTab;
