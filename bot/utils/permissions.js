const { PermissionFlagsBits } = require('discord.js');

class Permissions {
  static has(member, perms) {
    if (!member) return false;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    return member.permissions.has(perms);
  }
  static canModerate(m) { return this.has(m, PermissionFlagsBits.ModerateMembers); }
  static canBan(m) { return this.has(m, PermissionFlagsBits.BanMembers); }
  static canKick(m) { return this.has(m, PermissionFlagsBits.KickMembers); }
  static canManageMessages(m) { return this.has(m, PermissionFlagsBits.ManageMessages); }
  static canManageChannels(m) { return this.has(m, PermissionFlagsBits.ManageChannels); }
  static botCan(g, perm) { return g?.members?.me?.permissions?.has(perm) || false; }
  static isAboveBot(member, target) {
    if (!member || !target) return false;
    return target.roles.highest.position >= member.roles.highest.position;
  }
}

module.exports = Permissions;
