// Allow build scripts for all packages
function readPackage(pkg) {
  return pkg;
}
module.exports = { hooks: { readPackage } };
